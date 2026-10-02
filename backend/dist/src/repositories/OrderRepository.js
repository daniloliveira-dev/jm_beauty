import { AppointmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ConflictError, NotFoundError, ValidationError } from "../exceptions/DomainErrors.js";
const editableStatuses = new Set([AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS]);
async function updateTotal(tx, appointmentId) {
    const [items, adjustment, payments] = await Promise.all([
        tx.appointmentItem.findMany({ where: { appointmentId }, select: { quantity: true, unitPrice: true } }),
        tx.orderAdjustment.findUnique({ where: { appointmentId } }),
        tx.payment.findMany({ where: { appointmentId }, include: { refunds: { select: { amount: true } } } }),
    ]);
    const gross = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const price = gross - (adjustment?.discount ?? 0) + (adjustment?.extra ?? 0);
    const paid = payments.reduce((sum, payment) => sum + payment.amount - payment.refunds.reduce((n, refund) => n + refund.amount, 0), 0);
    if (price < 0 || price < paid)
        throw new ValidationError("Total inferior ao valor pago; ajuste desconto ou estorne o pagamento.");
    await tx.appointment.update({ where: { id: appointmentId }, data: { price } });
}
async function editable(tx, appointmentId) {
    const appointment = await tx.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment)
        throw new NotFoundError("Agendamento não encontrado.");
    if (!editableStatuses.has(appointment.status))
        throw new ValidationError("Comanda não pode ser alterada neste status.");
    return appointment;
}
export class OrderRepository {
    listProducts() {
        return prisma.product.findMany({ orderBy: { name: "asc" } });
    }
    createProduct(input) {
        return prisma.product.create({ data: input });
    }
    async updateProduct(id, input) {
        const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } });
        if (!existing)
            throw new NotFoundError("Produto não encontrado.");
        return prisma.product.update({ where: { id }, data: input });
    }
    async getOrder(appointmentId) {
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { items: true, adjustment: true, payments: { include: { refunds: true } } },
        });
        if (!appointment)
            throw new NotFoundError("Agendamento não encontrado.");
        return { appointment, items: appointment.items, adjustment: appointment.adjustment, payments: appointment.payments };
    }
    async addItem(appointmentId, input) {
        await prisma.$transaction(async (tx) => {
            const appointment = await editable(tx, appointmentId);
            if (input.kind === "produto") {
                const product = await tx.product.findFirst({ where: { id: input.item_id, active: true } });
                if (!product)
                    throw new ValidationError("Produto indisponível.");
                const result = await tx.product.updateMany({ where: { id: product.id, stock: { gte: input.quantity } }, data: { stock: { decrement: input.quantity } } });
                if (!result.count)
                    throw new ConflictError("Estoque insuficiente.");
                await tx.appointmentItem.create({ data: { appointmentId, kind: "produto", name: product.name, quantity: input.quantity, unitPrice: product.price, productId: product.id } });
            }
            else {
                const service = await tx.service.findFirst({ where: { id: input.item_id, active: true, skills: { some: { professionalId: appointment.professionalId } } } });
                if (!service)
                    throw new ValidationError("Serviço indisponível para esta profissional.");
                const endsAt = new Date(appointment.endsAt.getTime() + (service.duration + service.buffer) * input.quantity * 60_000);
                const conflicts = await tx.appointment.findFirst({
                    where: { id: { not: appointmentId }, professionalId: appointment.professionalId, status: { in: [...editableStatuses] }, startsAt: { lt: endsAt }, endsAt: { gt: appointment.startsAt } },
                    select: { id: true },
                });
                const block = await tx.scheduleBlock.findFirst({ where: { OR: [{ professionalId: appointment.professionalId }, { professionalId: null }], startsAt: { lt: endsAt }, endsAt: { gt: appointment.startsAt } }, select: { id: true } });
                if (conflicts || block)
                    throw new ConflictError("A duração adicional ocupa outro horário ou bloqueio.");
                const rule = await tx.commissionRule.findUnique({ where: { serviceId: service.id } });
                await tx.appointmentItem.create({ data: { appointmentId, kind: "servico", name: service.name, quantity: input.quantity, unitPrice: service.price, commission: rule?.percent ?? 0 } });
                await tx.appointment.update({ where: { id: appointmentId }, data: { endsAt } });
            }
            await updateTotal(tx, appointmentId);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    }
    async removeProductItem(appointmentId, itemId) {
        await prisma.$transaction(async (tx) => {
            await editable(tx, appointmentId);
            const item = await tx.appointmentItem.findFirst({ where: { id: itemId, appointmentId, kind: "produto" } });
            if (!item)
                throw new ValidationError("Somente produtos adicionais podem ser removidos.");
            if (item.productId)
                await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
            await tx.appointmentItem.delete({ where: { id: item.id } });
            await updateTotal(tx, appointmentId);
        });
    }
    async setAdjustment(appointmentId, input) {
        await prisma.$transaction(async (tx) => {
            await editable(tx, appointmentId);
            await tx.orderAdjustment.upsert({ where: { appointmentId }, create: { appointmentId, ...input }, update: input });
            await updateTotal(tx, appointmentId);
        });
    }
}
