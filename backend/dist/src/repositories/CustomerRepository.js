import { prisma } from "../config/database.js";
import { NotFoundError } from "../exceptions/DomainErrors.js";
export class CustomerRepository {
    async list(options) {
        const where = options.search
            ? { OR: [{ name: { contains: options.search } }, { email: { contains: options.search } }, { phone: { contains: options.search } }] }
            : {};
        const [rows, total] = await Promise.all([
            prisma.customer.findMany({ where, orderBy: { name: "asc" }, skip: options.skip, take: options.take }),
            prisma.customer.count({ where }),
        ]);
        return { rows, total };
    }
    create(input) {
        return prisma.customer.create({ data: { ...input, email: input.email || null } });
    }
    async update(id, input) {
        const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
        if (!customer)
            throw new NotFoundError("Cliente não encontrado.");
        return prisma.customer.update({ where: { id }, data: { ...input, email: input.email || null } });
    }
}
