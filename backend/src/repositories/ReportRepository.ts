import { AppointmentStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "../config/database.js";
import { legacyMethod } from "../dtos/payments/payment.dto.js";
import type { IReportRepository, ReportRange } from "./interfaces/IReportRepository.js";

function rangeDates(range: ReportRange) {
  const start = new Date(`${range.from}T00:00:00-03:00`);
  const end = new Date(`${range.to}T00:00:00-03:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

const methods = Object.values(PaymentMethod);

export class ReportRepository implements IReportRepository {
  async summary(range: ReportRange) {
    const { start, end } = rangeDates(range);
    const expenseStart = new Date(`${range.from}T00:00:00.000Z`);
    const expenseEnd = new Date(`${range.to}T00:00:00.000Z`);
    expenseEnd.setUTCDate(expenseEnd.getUTCDate() + 1);
    const [appointments, payments, expenses, refundsInRange, commissions] = await Promise.all([
      prisma.appointment.findMany({
        where: { startsAt: { gte: start, lt: end } },
        include: { payments: { include: { refunds: true } }, professional: { select: { name: true } }, user: { select: { name: true } } },
      }),
      prisma.payment.findMany({ where: { paidAt: { gte: start, lt: end } } }),
      prisma.expense.findMany({ where: { date: { gte: expenseStart, lt: expenseEnd } } }),
      prisma.refund.findMany({ where: { createdAt: { gte: start, lt: end } }, include: { payment: { select: { method: true } } } }),
      prisma.commission.findMany({ where: { appointment: { is: { startsAt: { gte: start, lt: end } } } } }),
    ]);

    const completed = appointments.filter((appointment) => appointment.status === AppointmentStatus.COMPLETED);
    const revenue = completed.reduce((sum, appointment) => sum + appointment.price, 0);
    const received = payments.reduce((sum, payment) => sum + payment.amount, 0) - refundsInRange.reduce((sum, refund) => sum + refund.amount, 0);
    const expensesTotal = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const outstanding = appointments
      .filter((appointment) => !new Set<AppointmentStatus>([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]).has(appointment.status))
      .reduce((sum, appointment) => {
        const paid = appointment.payments.reduce((value, payment) => value + payment.amount - payment.refunds.reduce((n, refund) => n + refund.amount, 0), 0);
        return sum + Math.max(0, appointment.price - paid);
      }, 0);

    const byMethod = Object.fromEntries(methods.map((method) => {
      const receivedByMethod = payments.filter((payment) => payment.method === method).reduce((sum, payment) => sum + payment.amount, 0);
      const refundedByMethod = refundsInRange.filter((refund) => refund.payment.method === method).reduce((sum, refund) => sum + refund.amount, 0);
      return [legacyMethod(method), receivedByMethod - refundedByMethod];
    }));

    return {
      from: range.from,
      to: range.to,
      revenue,
      received,
      refunded: refundsInRange.reduce((sum, refund) => sum + refund.amount, 0),
      commissions: commissions.reduce((sum, commission) => sum + commission.amount, 0),
      expenses: expensesTotal,
      result: received - expensesTotal,
      outstanding,
      attendances: completed.length,
      ticket: completed.length ? Math.round(revenue / completed.length) : 0,
      byMethod,
      appointments: appointments.map(({ user, professional, ...appointment }) => ({
        ...appointment,
        start: appointment.startsAt.toISOString(),
        end: appointment.endsAt.toISOString(),
        status: appointment.status,
        client: user.name,
        professional: professional.name,
      })),
    };
  }

  async byService(range: ReportRange) {
    const { start, end } = rangeDates(range);
    const rows = await prisma.appointment.groupBy({
      by: ["serviceId", "serviceName"],
      where: { startsAt: { gte: start, lt: end }, status: AppointmentStatus.COMPLETED },
      _count: { id: true },
      _sum: { price: true },
      orderBy: { _sum: { price: "desc" } },
    });
    return rows.map((row) => ({ service_id: row.serviceId, service: row.serviceName, appointments: row._count.id, revenue: row._sum.price ?? 0 }));
  }

  async byPaymentMethod(range: ReportRange) {
    const { start, end } = rangeDates(range);
    const rows = await prisma.payment.groupBy({
      by: ["method"],
      where: { paidAt: { gte: start, lt: end } },
      _count: { id: true },
      _sum: { amount: true },
    });
    return rows.map((row) => ({ method: legacyMethod(row.method), count: row._count.id, amount: row._sum.amount ?? 0 }));
  }

  async appointments(range: ReportRange) {
    const { start, end } = rangeDates(range);
    const rows = await prisma.appointment.findMany({
      where: { startsAt: { gte: start, lt: end } },
      include: { user: { select: { name: true } }, professional: { select: { name: true } } },
      orderBy: { startsAt: "asc" },
    });
    return rows.map(({ user, professional, ...appointment }) => ({
      ...appointment,
      start: appointment.startsAt.toISOString(),
      end: appointment.endsAt.toISOString(),
      client: user.name,
      professional: professional.name,
    }));
  }
}
