import { AppointmentStatus, CashRegisterStatus, CashTransactionType, PaymentMethod, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/database.js";
import { NotificationService } from "../services/NotificationService.js";
import { ReportRepository } from "../repositories/ReportRepository.js";

const notifications = new NotificationService();
const reports = new ReportRepository();

function localDate(value = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(value);
}

function localTime(value = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(value);
}

async function notifyOnce(key: string, userId: number, title: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      await tx.jobKey.create({ data: { key } });
      await notifications.enqueue(tx, userId, title);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}

export async function runScheduledJobs(): Promise<void> {
  const now = new Date();
  const today = localDate(now);
  await closeDueRegisters(today, localTime(now));
  await remindUpcomingAppointments(now);
  await snapshotPreviousMonth(today);
}

async function closeDueRegisters(today: string, time: string): Promise<void> {
  const settings = await prisma.salonSetting.findUnique({ where: { id: 1 } });
  const closingTime = settings?.closeTime ?? "19:00";
  const registers = await prisma.cashRegister.findMany({ where: { status: CashRegisterStatus.OPEN } });
  for (const register of registers) {
    const businessDate = register.businessDate.toISOString().slice(0, 10);
    if (businessDate > today || (businessDate === today && time < closingTime)) continue;
    await prisma.$transaction(async (tx) => {
      const totals = await tx.cashTransaction.groupBy({
        by: ["type"],
        where: { cashRegisterId: register.id, paymentMethod: PaymentMethod.CASH },
        _sum: { amount: true },
      });
      const income = totals.find((row) => row.type === CashTransactionType.INCOME)?._sum.amount ?? 0;
      const expenses = totals.find((row) => row.type === CashTransactionType.EXPENSE)?._sum.amount ?? 0;
      const claimed = await tx.cashRegister.updateMany({
        where: { id: register.id, status: CashRegisterStatus.OPEN },
        data: { expectedBalance: register.openingBalance + income - expenses, status: CashRegisterStatus.REVIEW, closedAt: new Date() },
      });
      if (!claimed.count) return;
      const admins = await tx.user.findMany({ where: { role: UserRole.ADMIN, active: true }, select: { id: true } });
      for (const admin of admins)
        await notifications.enqueue(tx, admin.id, `Fechamento de caixa disponível para conferência: ${businessDate}`);
    });
  }
}

async function remindUpcomingAppointments(now: Date): Promise<void> {
  const end = new Date(now.getTime() + 60 * 60_000);
  const appointments = await prisma.appointment.findMany({
    where: { startsAt: { gt: now, lte: end }, status: AppointmentStatus.CONFIRMED },
    select: { id: true, userId: true, startsAt: true },
  });
  for (const appointment of appointments) {
    await notifyOnce(
      `reminder-${appointment.id}-${appointment.startsAt.toISOString()}`,
      appointment.userId,
      "Seu atendimento começa em até uma hora. Confira seu horário no app.",
    );
  }
}

async function snapshotPreviousMonth(today: string): Promise<void> {
  const currentMonthStart = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  currentMonthStart.setUTCDate(0);
  const to = currentMonthStart.toISOString().slice(0, 10);
  const from = `${to.slice(0, 7)}-01`;
  const month = to.slice(0, 7);
  if (await prisma.monthlyReport.findUnique({ where: { month } })) return;

  const data = await reports.summary({ from, to });
  try {
    await prisma.monthlyReport.create({
      data: { month, data: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
  const admins = await prisma.user.findMany({ where: { role: UserRole.ADMIN, active: true }, select: { id: true } });
  for (const admin of admins)
    await notifyOnce(`monthly-${month}-${admin.id}`, admin.id, `Relatório mensal disponível: ${month}`);
}
