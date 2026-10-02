import { AppointmentStatus, CashRegisterStatus, CashTransactionType, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import type { BlockInput, IOperationsRepository, PushDeviceInput, WaitlistInput } from "./interfaces/IOperationsRepository.js";
import { ConflictError, NotFoundError, ValidationError } from "../exceptions/DomainErrors.js";

const occupied = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS];
const localDateString = (value = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(value);
const dbDate = (value: string) => new Date(`${value}T00:00:00.000Z`);

export class OperationsRepository implements IOperationsRepository {
  listBlocks() {
    return prisma.scheduleBlock.findMany({ orderBy: { startsAt: "desc" } }).then((rows) => rows.map((row) => ({ id: row.id, professional_id: row.professionalId, start: row.startsAt.toISOString(), end: row.endsAt.toISOString(), reason: row.reason })));
  }

  async createBlock(input: BlockInput) {
    const start = new Date(input.start);
    const end = new Date(input.end);
    return prisma.$transaction(async (tx) => {
      const overlap = await tx.appointment.findFirst({ where: { ...(input.professional_id ? { professionalId: input.professional_id } : {}), status: { in: occupied }, startsAt: { lt: end }, endsAt: { gt: start } }, select: { id: true } });
      if (overlap) throw new ConflictError("Reagende os atendimentos antes de bloquear este período.");
      return tx.scheduleBlock.create({ data: { professionalId: input.professional_id, startsAt: start, endsAt: end, reason: input.reason } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async deleteBlock(id: number): Promise<void> {
    await prisma.scheduleBlock.deleteMany({ where: { id } });
  }

  async listCommissionRules() {
    const services = await prisma.service.findMany({ orderBy: { name: "asc" }, include: { commissionRule: true } });
    return services.map((service) => ({ service_id: service.id, name: service.name, percent: service.commissionRule?.percent ?? 0 }));
  }

  async updateCommissionRule(serviceId: number, percent: number): Promise<void> {
    if (!(await prisma.service.findUnique({ where: { id: serviceId }, select: { id: true } }))) throw new NotFoundError("Serviço não encontrado.");
    await prisma.commissionRule.upsert({ where: { serviceId }, create: { serviceId, percent }, update: { percent } });
  }

  async listCommissions() {
    const rows = await prisma.commission.findMany({ include: { professional: { select: { name: true } }, appointment: { select: { startsAt: true } } }, orderBy: { appointment: { startsAt: "desc" } } });
    return rows.map(({ professional, appointment, ...commission }) => ({ ...commission, professional: professional.name, start: appointment.startsAt.toISOString() }));
  }

  async payCommission(appointmentId: number, method: PaymentMethod, actorId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const commission = await tx.commission.findUnique({ where: { appointmentId } });
      if (!commission || commission.paidAt || commission.amount <= 0) throw new ValidationError("Comissão não disponível.");
      const today = localDateString();
      const register = await tx.cashRegister.findFirst({ where: { businessDate: dbDate(today), status: CashRegisterStatus.OPEN } });
      if (method === PaymentMethod.CASH && !register) throw new ValidationError("Abra o caixa antes de pagar em dinheiro.");
      const expense = await tx.expense.create({ data: { description: `Comissão atendimento #${appointmentId}`, amount: commission.amount, method, date: dbDate(today) } });
      if (register && method === PaymentMethod.CASH) {
        await tx.cashTransaction.create({ data: { cashRegisterId: register.id, type: CashTransactionType.EXPENSE, description: expense.description, amount: commission.amount, paymentMethod: method, createdBy: actorId } });
      }
      await tx.commission.update({ where: { appointmentId }, data: { paidAt: new Date(), expenseId: expense.id } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async listWaitlist(actorId: number, isAdmin: boolean) {
    const rows = await prisma.waitlistEntry.findMany({
      where: isAdmin ? undefined : { userId: actorId },
      include: { user: { select: { name: true } } },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(({ user, date, ...row }) => ({ ...row, date: localDateString(date), client: user.name, user_id: row.userId, service_id: row.serviceId, professional_id: row.professionalId, status: row.status === "waiting" ? "aguardando" : row.status }));
  }

  async createWaitlist(actorId: number, input: WaitlistInput) {
    if (input.date < localDateString()) throw new ValidationError("Escolha uma data futura.");
    const skill = await prisma.professionalSkill.findUnique({ where: { professionalId_serviceId: { professionalId: input.professional_id, serviceId: input.service_id } } });
    if (!skill) throw new ValidationError("Serviço ou profissional inválido.");
    const date = dbDate(input.date);
    const existing = await prisma.waitlistEntry.findFirst({ where: { userId: actorId, serviceId: input.service_id, professionalId: input.professional_id, date, status: "waiting" } });
    if (existing) throw new ConflictError("Você já está na lista de espera.");
    const row = await prisma.waitlistEntry.create({ data: { userId: actorId, serviceId: input.service_id, professionalId: input.professional_id, date } });
    return { id: row.id, service_id: row.serviceId, professional_id: row.professionalId, date: input.date };
  }

  listNotifications(userId: number) {
    return prisma.notification.findMany({ where: { userId }, orderBy: { id: "desc" }, take: 50 });
  }

  async registerPushDevice(userId: number, input: PushDeviceInput): Promise<void> {
    await prisma.pushDevice.upsert({ where: { token: input.token }, create: { token: input.token, userId, enabled: input.enabled }, update: { userId, enabled: input.enabled } });
  }

  async removePushDevices(userId: number): Promise<void> {
    await prisma.pushDevice.deleteMany({ where: { userId } });
  }

  listMonthlyReports() {
    return prisma.monthlyReport.findMany({ select: { month: true, createdAt: true }, orderBy: { month: "desc" } });
  }

  async getMonthlyReport(month: string) {
    const report = await prisma.monthlyReport.findUnique({ where: { month } });
    if (!report) throw new NotFoundError("Relatório não encontrado.");
    return report.data;
  }

  listAuditLogs() {
    return prisma.auditLog.findMany({ orderBy: { id: "desc" }, take: 200 });
  }
}
