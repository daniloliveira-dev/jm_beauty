import { AppointmentStatus, Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/database.js";
import type { CreateAppointmentDTO } from "../dtos/appointments/appointment.dto.js";
import { AuthenticationError, ConflictError, NotFoundError, ValidationError } from "../exceptions/DomainErrors.js";
import type { AppointmentActor, IAppointmentRepository } from "./interfaces/IAppointmentRepository.js";
import { AppointmentService } from "../services/AppointmentService.js";
import { NotificationService } from "../services/NotificationService.js";

const TIME_ZONE = "America/Sao_Paulo";
const occupiedStatuses = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS];
const appointmentPolicy = new AppointmentService();
const notifications = new NotificationService();

function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const data = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return { day: weekdays.indexOf(data.weekday ?? ""), minute: Number(data.hour ?? "0") * 60 + Number(data.minute ?? "0") };
}

function timeToMinutes(value: string): number {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function dayRange(date: string) {
  const start = new Date(`${date}T00:00:00-03:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export class AppointmentRepository implements IAppointmentRepository {
  async list(actor: AppointmentActor, date?: string, skip = 0, take = 100) {
    const where = {
      ...(actor.role === UserRole.USER ? { userId: actor.userId } : {}),
      ...(date ? { startsAt: { gte: dayRange(date).start, lt: dayRange(date).end } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          customer: { select: { name: true } },
          user: { select: { name: true } },
          professional: { select: { name: true } },
          payments: { include: { refunds: { select: { amount: true } } } },
        },
        orderBy: { startsAt: "desc" }, skip, take,
      }),
      prisma.appointment.count({ where }),
    ]);
    const formatted = rows.map(({ payments, user, customer, professional, ...appointment }) => {
      const paid = payments.reduce((sum, payment) => sum + payment.amount - payment.refunds.reduce((refunded, refund) => refunded + refund.amount, 0), 0);
      return {
        ...appointment,
        start: appointment.startsAt.toISOString(),
        end: appointment.endsAt.toISOString(),
        status: this.toLegacyStatus(appointment.status),
        user_id: appointment.userId,
        service_id: appointment.serviceId,
        professional_id: appointment.professionalId,
        customer_id: appointment.customerId,
        client: customer?.name ?? user.name,
        professional: professional.name,
        paid,
      };
    });
    return { rows: formatted, total };
  }

  async availability(serviceId: number, professionalId: number, date: string) {
    const service = await prisma.service.findFirst({ where: { id: serviceId, active: true } });
    const professional = await prisma.professional.findFirst({
      where: { id: professionalId, active: true, skills: { some: { serviceId } } },
    });
    if (!service || !professional) throw new ValidationError("Serviço ou profissional indisponível.");
    const { start: dayStart, end: dayEnd } = dayRange(date);
    const weekday = localParts(dayStart).day;
    const hours = await prisma.businessHour.findMany({ where: { dayOfWeek: weekday, active: true }, orderBy: { openingTime: "asc" } });
    const appointments = await prisma.appointment.findMany({
      where: { professionalId, status: { in: occupiedStatuses }, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    });
    const blocks = await prisma.scheduleBlock.findMany({
      where: { OR: [{ professionalId }, { professionalId: null }], startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { startsAt: true, endsAt: true },
    });
    const busy = [...appointments, ...blocks];
    const slots: Array<{ start: string; label: string }> = [];
    for (const interval of hours) {
      const openingMinute = timeToMinutes(interval.openingTime);
      const closingMinute = timeToMinutes(interval.closingTime);
      for (let minute = openingMinute; minute + service.duration + service.buffer <= closingMinute; minute += 15) {
        const label = `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
        const startsAt = new Date(`${date}T${label}:00-03:00`);
        const endsAt = appointmentPolicy.calculateEnd(startsAt, service.duration, service.buffer);
        if (startsAt <= new Date()) continue;
        try {
          appointmentPolicy.assertNoOverlap(startsAt, endsAt, busy);
        } catch {
          continue;
        }
        slots.push({ start: startsAt.toISOString(), label });
      }
    }
    return slots;
  }

  async create(actor: AppointmentActor, input: CreateAppointmentDTO) {
    const userId = actor.role === UserRole.USER ? actor.userId : input.user_id ?? actor.userId;
    const startsAt = new Date(input.start);
    const service = await prisma.service.findFirst({ where: { id: input.service_id, active: true } });
    if (!service) throw new ValidationError("Serviço inativo ou inexistente.");
    const professional = await prisma.professional.findFirst({
      where: { id: input.professional_id, active: true, skills: { some: { serviceId: service.id } } },
    });
    if (!professional) throw new ValidationError("Profissional indisponível para este serviço.");
    const endAt = appointmentPolicy.calculateEnd(startsAt, service.duration, service.buffer);
    const { day, minute } = localParts(startsAt);
    appointmentPolicy.assertBookableStart(startsAt);
    const sameLocalDay = dayRange(new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(startsAt)).end;
    if (endAt > sameLocalDay) throw new ValidationError("Atendimento ultrapassa o dia selecionado.");

    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM professionals WHERE id = ${professional.id} FOR UPDATE`;
      const openHours = await tx.businessHour.findMany({ where: { dayOfWeek: day, active: true } });
      const startMinute = minute;
      const localEnd = localParts(endAt).minute;
      appointmentPolicy.assertInsideBusinessHours(startMinute, localEnd, openHours.map((hour) => ({ start: timeToMinutes(hour.openingTime), end: timeToMinutes(hour.closingTime) })));
      const overlap = await tx.appointment.findFirst({
        where: { professionalId: professional.id, status: { in: occupiedStatuses }, startsAt: { lt: endAt }, endsAt: { gt: startsAt } },
        select: { startsAt: true, endsAt: true },
      });
      const block = await tx.scheduleBlock.findFirst({
        where: { OR: [{ professionalId: professional.id }, { professionalId: null }], startsAt: { lt: endAt }, endsAt: { gt: startsAt } },
        select: { startsAt: true, endsAt: true },
      });
      appointmentPolicy.assertNoOverlap(startsAt, endAt, [overlap, block].filter((item): item is NonNullable<typeof item> => item !== null));
      if (!(await tx.user.findFirst({ where: { id: userId, active: true }, select: { id: true } })))
        throw new ValidationError("Cliente inválido.");
      if (input.customer_id) {
        const customer = await tx.customer.findUnique({ where: { id: input.customer_id }, select: { id: true, userId: true } });
        if (!customer || (actor.role === UserRole.USER && customer.userId !== actor.userId))
          throw new ValidationError("Cliente inválido.");
      }
      const rule = await tx.commissionRule.findUnique({ where: { serviceId: service.id } });
      const appointment = await tx.appointment.create({
        data: {
          userId,
          customerId: input.customer_id,
          professionalId: professional.id,
          serviceId: service.id,
          startsAt,
          endsAt: endAt,
          price: service.price,
          serviceName: service.name,
          notes: input.notes,
          status: actor.role === UserRole.USER ? AppointmentStatus.CONFIRMED : AppointmentStatus.PENDING,
          items: { create: { kind: "servico", name: service.name, quantity: 1, unitPrice: service.price, commission: rule?.percent ?? 0 } },
        },
        select: { id: true },
      });
      await notifications.enqueue(tx, userId, "Seu agendamento foi confirmado.");
      return appointment;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async cancel(actor: AppointmentActor, id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id }, include: { payments: { include: { refunds: true } } } });
      if (!appointment) throw new NotFoundError("Agendamento não encontrado.");
      if (actor.role === UserRole.USER && appointment.userId !== actor.userId) throw new AuthenticationError("Acesso negado.");
      if (!new Set<AppointmentStatus>([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]).has(appointment.status)) throw new ValidationError("Este agendamento não pode ser cancelado.");
      const paid = appointment.payments.reduce((sum, payment) => sum + payment.amount - payment.refunds.reduce((n, refund) => n + refund.amount, 0), 0);
      if (paid > 0) throw new ConflictError("Agendamento com pagamento: faça o estorno antes de cancelar.");
      if (actor.role === UserRole.USER) {
        const setting = await tx.salonSetting.findUnique({ where: { id: 1 } });
        const remaining = appointment.startsAt.getTime() - Date.now();
        if (remaining < (setting?.cancelHours ?? 24) * 3_600_000) throw new ValidationError(`Cancelamentos exigem ${setting?.cancelHours ?? 24} horas de antecedência.`);
      }
      await tx.appointment.update({ where: { id }, data: { status: AppointmentStatus.CANCELLED } });
      await notifications.enqueue(tx, appointment.userId, "Seu agendamento foi cancelado.");
    });
  }

  async reschedule(actor: AppointmentActor, id: number, start: string): Promise<void> {
    const appointment = await prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new NotFoundError("Agendamento não encontrado.");
    if (actor.role === UserRole.USER && appointment.userId !== actor.userId) throw new AuthenticationError("Acesso negado.");
    if (!new Set<AppointmentStatus>([AppointmentStatus.CONFIRMED, AppointmentStatus.PENDING]).has(appointment.status)) throw new ValidationError("Este agendamento não pode ser alterado.");
    if (actor.role === UserRole.USER) {
      const setting = await prisma.salonSetting.findUnique({ where: { id: 1 } });
      if (appointment.startsAt.getTime() - Date.now() < (setting?.cancelHours ?? 24) * 3_600_000)
        throw new ValidationError("Prazo mínimo para alteração não atendido.");
    }
    const slot = await this.availability(appointment.serviceId, appointment.professionalId, new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date(start)));
    if (!slot.some((item) => item.start === new Date(start).toISOString())) throw new ConflictError("Horário não disponível.");
    const startsAt = new Date(start);
    const endsAt = new Date(startsAt.getTime() + appointment.endsAt.getTime() - appointment.startsAt.getTime());
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw<Array<{ id: number }>>`SELECT id FROM professionals WHERE id = ${appointment.professionalId} FOR UPDATE`;
      const [overlap, block] = await Promise.all([
        tx.appointment.findFirst({ where: { id: { not: id }, professionalId: appointment.professionalId, status: { in: occupiedStatuses }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { startsAt: true, endsAt: true } }),
        tx.scheduleBlock.findFirst({ where: { OR: [{ professionalId: appointment.professionalId }, { professionalId: null }], startsAt: { lt: endsAt }, endsAt: { gt: startsAt } }, select: { startsAt: true, endsAt: true } }),
      ]);
      appointmentPolicy.assertNoOverlap(startsAt, endsAt, [overlap, block].filter((item): item is NonNullable<typeof item> => item !== null));
      await tx.appointment.update({ where: { id }, data: { startsAt, endsAt } });
      await notifications.enqueue(tx, appointment.userId, "Seu agendamento foi reagendado.");
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateStatus(id: number, status: AppointmentStatus): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({ where: { id } });
      if (!appointment) throw new NotFoundError("Agendamento não encontrado.");
      const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
        PENDING: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
        CONFIRMED: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED],
        IN_PROGRESS: [AppointmentStatus.COMPLETED],
        COMPLETED: [], CANCELLED: [], NO_SHOW: [],
      };
      if (!transitions[appointment.status].includes(status)) throw new ValidationError("Transição de status inválida.");
      await tx.appointment.update({ where: { id }, data: { status } });
      if (status === AppointmentStatus.COMPLETED) {
        const [items, adjustment] = await Promise.all([
          tx.appointmentItem.findMany({ where: { appointmentId: id, kind: "servico" } }),
          tx.orderAdjustment.findUnique({ where: { appointmentId: id } }),
        ]);
        const gross = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const net = BigInt(Math.max(0, gross - (adjustment?.discount ?? 0)));
        const denominator = BigInt(gross || 1) * 100n;
        const commissionAmount = items.reduce((sum, item) => {
          const numerator = BigInt(item.quantity) * BigInt(item.unitPrice) * BigInt(item.commission) * net;
          return sum + Number((numerator + denominator / 2n) / denominator);
        }, 0);
        await tx.commission.upsert({
          where: { appointmentId: id },
          create: { appointmentId: id, professionalId: appointment.professionalId, amount: commissionAmount },
          update: {},
        });
      }
    });
  }

  private toLegacyStatus(status: AppointmentStatus): string {
    const legacy: Record<AppointmentStatus, string> = {
      PENDING: "aguardando_confirmacao", CONFIRMED: "confirmado", IN_PROGRESS: "em_atendimento",
      COMPLETED: "concluido", CANCELLED: "cancelado", NO_SHOW: "nao_compareceu",
    };
    return legacy[status];
  }
}
