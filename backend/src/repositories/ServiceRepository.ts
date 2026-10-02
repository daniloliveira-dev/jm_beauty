import { prisma } from "../config/database.js";
import type { ServiceInput } from "../dtos/services/service.dto.js";
import type { IServiceRepository } from "./interfaces/IServiceRepository.js";

export class ServiceRepository implements IServiceRepository {
  async list(options: { skip: number; take: number; search?: string; includeInactive: boolean }) {
    const where = {
      ...(options.includeInactive ? {} : { active: true }),
      ...(options.search ? { name: { contains: options.search } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.service.findMany({ where, orderBy: { name: "asc" }, skip: options.skip, take: options.take }),
      prisma.service.count({ where }),
    ]);
    return { rows, total };
  }

  findById(id: number) {
    return prisma.service.findUnique({ where: { id } });
  }

  create(data: ServiceInput) {
    return prisma.service.create({ data });
  }

  update(id: number, data: ServiceInput) {
    return prisma.service.update({ where: { id }, data });
  }

  async delete(id: number): Promise<{ archived: boolean }> {
    const appointments = await prisma.appointment.count({ where: { serviceId: id } });
    if (appointments) {
      await prisma.service.update({ where: { id }, data: { active: false } });
      return { archived: true };
    }
    await prisma.service.delete({ where: { id } });
    return { archived: false };
  }
}
