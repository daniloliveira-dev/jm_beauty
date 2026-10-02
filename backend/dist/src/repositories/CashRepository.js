import { CashRegisterStatus, CashTransactionType, PaymentMethod, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ConflictError, ValidationError } from "../exceptions/DomainErrors.js";
import { legacyMethod } from "../dtos/payments/payment.dto.js";
function localDateString(value = new Date()) {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(value);
}
function asDbDate(value) {
    return new Date(`${value}T00:00:00.000Z`);
}
function legacyCashStatus(status) {
    return status === CashRegisterStatus.OPEN ? "aberto" : status === CashRegisterStatus.REVIEW ? "aguardando_conferencia" : "conferido";
}
export class CashRepository {
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
    async open(initial, actorId) {
        const date = localDateString();
        try {
            return await prisma.$transaction(async (tx) => {
                const register = await tx.cashRegister.create({ data: { businessDate: asDbDate(date), openingBalance: initial } });
                await tx.auditLog.create({ data: { userId: actorId, action: "cash_open", entityId: register.id } });
                return { date, initial: register.openingBalance };
            });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
                throw new ConflictError("Caixa do dia já existente.");
            throw error;
        }
    }
    async close(date) {
        await prisma.$transaction(async (tx) => {
            const register = await tx.cashRegister.findUnique({ where: { businessDate: asDbDate(date) } });
            if (!register || register.status !== CashRegisterStatus.OPEN)
                throw new ValidationError("Caixa não está aberto.");
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
    async reconcile(date, counted) {
        const result = await prisma.cashRegister.updateMany({
            where: { businessDate: asDbDate(date), status: CashRegisterStatus.REVIEW },
            data: { countedBalance: counted, closingBalance: counted, status: CashRegisterStatus.CLOSED },
        });
        if (!result.count)
            throw new ValidationError("Caixa não disponível para conferência.");
    }
    async listExpenses() {
        const rows = await prisma.expense.findMany({ orderBy: { date: "desc" }, take: 500 });
        return rows.map((row) => ({ ...row, method: legacyMethod(row.method), date: localDateString(row.date) }));
    }
    async createExpense(input) {
        if (input.date !== localDateString())
            throw new ValidationError("Registre a despesa na data atual.");
        return prisma.$transaction(async (tx) => {
            const businessDate = asDbDate(input.date);
            const register = await tx.cashRegister.findFirst({ where: { businessDate, status: CashRegisterStatus.OPEN } });
            if (input.method === PaymentMethod.CASH && !register)
                throw new ValidationError("Abra o caixa antes de pagar em dinheiro.");
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
