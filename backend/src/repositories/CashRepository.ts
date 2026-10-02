import { CashRegisterStatus, CashTransactionType, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ConflictError, ValidationError } from "../exceptions/DomainErrors.js";
import type { ICashRepository } from "./interfaces/ICashRepository.js";
import { legacyMethod } from "../dtos/payments/payment.dto.js";

function localDateString(value = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(value);
}
function asDbDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
function localDayBounds(value: string) {
  const start = new Date(`${value}T00:00:00.000-03:00`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
function legacyCashStatus(status: CashRegisterStatus): string {
  return status === CashRegisterStatus.OPEN ? "aberto" : status === CashRegisterStatus.REVIEW ? "aguardando_conferencia" : "conferido";
}

export class CashRepository implements ICashRepository {
  async list() {
    const rows = await prisma.cashRegister.findMany({ orderBy: { businessDate: "desc" }, take: 90 });
    return rows.map((row) => ({
      id: row.id,
      date: localDateString(row.businessDate),
      initial: row.openingBalance,
      expected: row.expectedBalance,
      counted: row.countedBalance,
      status: legacyCashStatus(row.status),
      opened_at: row.openedAt.toISOString(),
      closed_at: row.closedAt?.toISOString() ?? null,
    }));
  }

  async summary(date: string) {
    const businessDate = asDbDate(date);
    const { start, end } = localDayBounds(date);
    const [register, payments, refunds, cashTransactions, expenses] = await Promise.all([
      prisma.cashRegister.findUnique({ where: { businessDate } }),
      prisma.payment.findMany({
        where: { status: PaymentStatus.PAID, paidAt: { gte: start, lt: end } },
        include: {
          appointment: { include: { user: { select: { name: true } } } },
          refunds: { where: { createdAt: { gte: start, lt: end } } },
        },
        orderBy: { paidAt: "desc" },
      }),
      prisma.refund.findMany({
        where: { createdAt: { gte: start, lt: end } },
        include: { payment: { include: { appointment: { include: { user: { select: { name: true } } } } } } },
        orderBy: { createdAt: "desc" },
      }),
      registerTransactions(businessDate),
      prisma.expense.findMany({ where: { date: businessDate }, orderBy: { createdAt: "desc" } }),
    ]);

    const sums = { income: 0, expenses: 0, withdrawals: 0 };
    for (const transaction of cashTransactions) {
      if (transaction.type === CashTransactionType.INCOME) sums.income += transaction.amount;
      else {
        sums.expenses += transaction.amount;
        if (transaction.description.toLocaleLowerCase().startsWith("sangria"))
          sums.withdrawals += transaction.amount;
      }
    }

    const byMethod: Record<string, number> = { dinheiro: 0, pix: 0, debito: 0, credito: 0, other: 0 };
    for (const payment of payments) {
      const method = legacyMethod(payment.method);
      byMethod[method] = (byMethod[method] ?? 0) + payment.amount;
      for (const refund of payment.refunds) byMethod[method] -= refund.amount;
    }
    for (const refund of refunds) {
      if (refund.payment.paidAt >= start && refund.payment.paidAt < end) continue;
      const method = legacyMethod(refund.payment.method);
      byMethod[method] = (byMethod[method] ?? 0) - refund.amount;
    }

    const recent = [
      ...payments.map((payment) => ({
        id: `payment-${payment.id}`,
        type: "income",
        description: payment.appointment.user.name,
        method: legacyMethod(payment.method),
        amount: payment.amount,
        createdAt: payment.paidAt.toISOString(),
      })),
      ...refunds
        .filter((refund) => refund.payment.method !== PaymentMethod.CASH)
        .map((refund) => ({
          id: `refund-${refund.id}`,
          type: "expense",
          description: `Estorno · ${refund.payment.appointment.user.name}`,
          method: legacyMethod(refund.payment.method),
          amount: refund.amount,
          createdAt: refund.createdAt.toISOString(),
        })),
      ...expenses
        .filter((expense) => expense.method !== PaymentMethod.CASH)
        .map((expense) => ({
          id: `expense-${expense.id}`,
          type: "expense",
          description: expense.description,
          method: legacyMethod(expense.method),
          amount: expense.amount,
          createdAt: expense.createdAt.toISOString(),
        })),
      ...cashTransactions
        .filter((transaction) => transaction.type === CashTransactionType.EXPENSE)
        .map((transaction) => ({
          id: `cash-${transaction.id}`,
          type: "expense",
          description: transaction.description,
          method: "dinheiro",
          amount: transaction.amount,
          createdAt: transaction.createdAt.toISOString(),
          actor: transaction.creator.name,
        })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20);

    const openingAudit = register
      ? await prisma.auditLog.findFirst({
          where: { action: "cash_open", entityId: register.id },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        })
      : null;

    return {
      date,
      status: register ? legacyCashStatus(register.status) : "nao_aberto",
      initial: register?.openingBalance ?? 0,
      income: sums.income,
      cashExpenses: sums.expenses,
      withdrawals: sums.withdrawals,
      expected: register ? register.openingBalance + sums.income - sums.expenses : null,
      counted: register?.countedBalance ?? null,
      openedAt: register?.openedAt.toISOString() ?? null,
      openedBy: openingAudit?.user?.name ?? null,
      receivedByMethod: byMethod,
      recent,
    };
  }

  async withdraw(input: { date: string; amount: number; description: string; actorId: number }) {
    const businessDate = asDbDate(input.date);
    return prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.findUnique({ where: { businessDate } });
      if (!register || register.status !== CashRegisterStatus.OPEN)
        throw new ValidationError("Abra o caixa antes de registrar uma sangria.");

      const totals = await tx.cashTransaction.groupBy({
        by: ["type"],
        where: { cashRegisterId: register.id, paymentMethod: PaymentMethod.CASH },
        _sum: { amount: true },
      });
      const income = totals.find((row) => row.type === CashTransactionType.INCOME)?._sum.amount ?? 0;
      const outflow = totals.find((row) => row.type === CashTransactionType.EXPENSE)?._sum.amount ?? 0;
      if (input.amount > register.openingBalance + income - outflow)
        throw new ValidationError("A sangria não pode ser maior que o dinheiro disponível no caixa.");

      const description = input.description.toLocaleLowerCase().startsWith("sangria")
        ? input.description
        : `Sangria · ${input.description}`;
      const transaction = await tx.cashTransaction.create({
        data: {
          cashRegisterId: register.id,
          type: CashTransactionType.EXPENSE,
          description,
          amount: input.amount,
          paymentMethod: PaymentMethod.CASH,
          createdBy: input.actorId,
        },
      });
      await tx.auditLog.create({ data: { userId: input.actorId, action: "cash_withdrawal", entityId: register.id } });
      return { id: transaction.id, amount: transaction.amount, description: transaction.description };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async open(initial: number, actorId: number) {
    const date = localDateString();
    try {
      return await prisma.$transaction(async (tx) => {
        const register = await tx.cashRegister.create({ data: { businessDate: asDbDate(date), openingBalance: initial } });
        await tx.auditLog.create({ data: { userId: actorId, action: "cash_open", entityId: register.id } });
        return { date, initial: register.openingBalance };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ConflictError("Caixa do dia já existente.");
      throw error;
    }
  }

  async close(date: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const register = await tx.cashRegister.findUnique({ where: { businessDate: asDbDate(date) } });
      if (!register || register.status !== CashRegisterStatus.OPEN) throw new ValidationError("Caixa não está aberto.");
      const totals = await tx.cashTransaction.groupBy({
        by: ["type"],
        where: { cashRegisterId: register.id, paymentMethod: PaymentMethod.CASH },
        _sum: { amount: true },
      });
      const income = totals.find((row) => row.type === CashTransactionType.INCOME)?._sum.amount ?? 0;
      const expense = totals.find((row) => row.type === CashTransactionType.EXPENSE)?._sum.amount ?? 0;
      await tx.cashRegister.update({
        where: { id: register.id },
        data: { expectedBalance: register.openingBalance + income - expense, status: CashRegisterStatus.REVIEW, closedAt: new Date() },
      });
    });
  }

  async reconcile(date: string, counted: number): Promise<void> {
    const result = await prisma.cashRegister.updateMany({
      where: { businessDate: asDbDate(date), status: CashRegisterStatus.REVIEW },
      data: { countedBalance: counted, closingBalance: counted, status: CashRegisterStatus.CLOSED },
    });
    if (!result.count) throw new ValidationError("Caixa não disponível para conferência.");
  }

  async listExpenses() {
    const rows = await prisma.expense.findMany({ orderBy: { date: "desc" }, take: 500 });
    return rows.map((row) => ({ ...row, method: legacyMethod(row.method), date: localDateString(row.date) }));
  }

  async createExpense(input: { description: string; amount: number; method: PaymentMethod; date: string; actorId: number }) {
    if (input.date !== localDateString()) throw new ValidationError("Registre a despesa na data atual.");
    return prisma.$transaction(async (tx) => {
      const businessDate = asDbDate(input.date);
      const register = await tx.cashRegister.findFirst({ where: { businessDate, status: CashRegisterStatus.OPEN } });
      if (input.method === PaymentMethod.CASH && !register) throw new ValidationError("Abra o caixa antes de pagar em dinheiro.");
      const expense = await tx.expense.create({ data: { description: input.description, amount: input.amount, method: input.method, date: businessDate } });
      if (register && input.method === PaymentMethod.CASH) {
        await tx.cashTransaction.create({
          data: { cashRegisterId: register.id, type: CashTransactionType.EXPENSE, description: input.description, amount: input.amount, paymentMethod: input.method, createdBy: input.actorId },
        });
      }
      return { id: expense.id, description: expense.description, amount: expense.amount, method: legacyMethod(expense.method), date: input.date };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}

async function registerTransactions(businessDate: Date) {
  const register = await prisma.cashRegister.findUnique({ where: { businessDate }, select: { id: true } });
  if (!register) return [];
  return prisma.cashTransaction.findMany({
    where: { cashRegisterId: register.id },
    include: { creator: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
}
