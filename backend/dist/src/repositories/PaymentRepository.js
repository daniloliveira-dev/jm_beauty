import { AppointmentStatus, CashTransactionType, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ConflictError, NotFoundError, ValidationError } from "../exceptions/DomainErrors.js";
import { PaymentService } from "../services/PaymentService.js";
const paymentPolicy = new PaymentService();
export class PaymentRepository {
    async record(input) {
        return prisma.$transaction(async (tx) => {
            const prior = await tx.payment.findUnique({ where: { requestKey: input.requestKey } });
            if (prior) {
                paymentPolicy.assertRequestKeyMatches(prior, input);
                return { id: prior.id, appointment_id: prior.appointmentId, amount: prior.amount, method: prior.method };
            }
            const appointment = await tx.appointment.findUnique({ where: { id: input.appointmentId }, include: { payments: { include: { refunds: true } } } });
            if (!appointment || new Set([AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW]).has(appointment.status))
                throw new ValidationError("Atendimento inválido.");
            const paid = appointment.payments.reduce((sum, payment) => sum + payment.amount - payment.refunds.reduce((n, refund) => n + refund.amount, 0), 0);
            paymentPolicy.assertWithinBalance(paid, input.amount, appointment.price);
            const now = new Date();
            const businessDate = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now) + "T00:00:00.000Z");
            const register = await tx.cashRegister.findFirst({ where: { businessDate, status: "OPEN" } });
            if (input.method === PaymentMethod.CASH && !register)
                throw new ValidationError("Abra o caixa antes de receber dinheiro.");
            const payment = await tx.payment.create({
                data: {
                    appointmentId: appointment.id,
                    amount: input.amount,
                    method: input.method,
                    status: PaymentStatus.PAID,
                    paidAt: now,
                    requestKey: input.requestKey,
                },
            });
            if (register && input.method === PaymentMethod.CASH) {
                await tx.cashTransaction.create({
                    data: { cashRegisterId: register.id, type: CashTransactionType.INCOME, description: `Pagamento do atendimento #${appointment.id}`, amount: input.amount, paymentMethod: input.method, createdBy: input.actorId },
                });
            }
            return { id: payment.id, appointment_id: payment.appointmentId, amount: payment.amount, method: payment.method };
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
    async refund(input) {
        await prisma.$transaction(async (tx) => {
            const existing = await tx.refund.findUnique({ where: { requestKey: input.requestKey } });
            if (existing) {
                if (existing.paymentId !== input.paymentId || existing.amount !== input.amount)
                    throw new ConflictError("Chave de estorno já usada com outros dados.");
                return;
            }
            const payment = await tx.payment.findUnique({ where: { id: input.paymentId }, include: { refunds: true } });
            if (!payment)
                throw new NotFoundError("Pagamento não encontrado.");
            const refunded = payment.refunds.reduce((sum, refund) => sum + refund.amount, 0);
            paymentPolicy.assertRefundWithinPayment(refunded, input.amount, payment.amount);
            if (payment.method === PaymentMethod.CASH) {
                const now = new Date();
                const businessDate = new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now) + "T00:00:00.000Z");
                const register = await tx.cashRegister.findFirst({ where: { businessDate, status: "OPEN" } });
                if (!register)
                    throw new ValidationError("Abra o caixa antes de estornar dinheiro.");
                await tx.cashTransaction.create({
                    data: { cashRegisterId: register.id, type: CashTransactionType.EXPENSE, description: `Estorno de pagamento #${payment.id}`, amount: input.amount, paymentMethod: payment.method, createdBy: input.actorId },
                });
            }
            await tx.refund.create({ data: { paymentId: input.paymentId, amount: input.amount, reason: input.reason, requestKey: input.requestKey } });
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
}
