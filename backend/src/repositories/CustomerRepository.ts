import { prisma } from "../config/database.js";
import type { CustomerInput } from "../dtos/customers/customer.dto.js";
import { NotFoundError } from "../exceptions/DomainErrors.js";
import type { ICustomerRepository } from "./interfaces/ICustomerRepository.js";

export class CustomerRepository implements ICustomerRepository {
  async list(options: { skip: number; take: number; search?: string }) {
    const where = options.search
      ? { OR: [{ name: { contains: options.search } }, { email: { contains: options.search } }, { phone: { contains: options.search } }] }
      : {};
    const [rows, total] = await Promise.all([
      prisma.customer.findMany({ where, orderBy: { name: "asc" }, skip: options.skip, take: options.take }),
      prisma.customer.count({ where }),
    ]);
    return { rows, total };
  }

  create(input: CustomerInput) {
    return prisma.customer.create({ data: { ...input, email: input.email || null } });
  }

  async update(id: number, input: CustomerInput) {
    const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
    if (!customer) throw new NotFoundError("Cliente não encontrado.");
    return prisma.customer.update({ where: { id }, data: { ...input, email: input.email || null } });
  }
}
