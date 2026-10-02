import { prisma } from "../config/database.js";
import type { ProfessionalInput } from "../dtos/professionals/professional.dto.js";
import { NotFoundError, ValidationError } from "../exceptions/DomainErrors.js";
import type { IProfessionalRepository } from "./interfaces/IProfessionalRepository.js";

export class ProfessionalRepository implements IProfessionalRepository {
  async list(activeOnly: boolean) {
    const rows = await prisma.professional.findMany({
      where: activeOnly ? { active: true } : undefined,
      include: { skills: { select: { serviceId: true } } },
      orderBy: { name: "asc" },
    });
    return rows.map(({ skills, ...professional }) => ({
      ...professional,
      serviceIds: skills.map((skill) => skill.serviceId),
    }));
  }

  async save(input: ProfessionalInput, id?: number) {
    const serviceIds = [...new Set(input.service_ids)];
    if (serviceIds.length) {
      const count = await prisma.service.count({ where: { id: { in: serviceIds } } });
      if (count !== serviceIds.length) throw new ValidationError("Serviço inválido.");
    }
    return prisma.$transaction(async (tx) => {
      const existing = id ? await tx.professional.findUnique({ where: { id } }) : null;
      if (id && !existing) throw new NotFoundError("Profissional não encontrado.");
      const data = {
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        specialty: input.specialty,
        active: input.active,
        skills: { deleteMany: {}, create: serviceIds.map((serviceId) => ({ serviceId })) },
      };
      const result = id
        ? await tx.professional.update({ where: { id }, data, include: { skills: true } })
        : await tx.professional.create({ data, include: { skills: true } });
      return {
        id: result.id,
        name: result.name,
        phone: result.phone,
        email: result.email,
        specialty: result.specialty,
        active: result.active,
        serviceIds: result.skills.map((skill) => skill.serviceId),
      };
    });
  }

  async delete(id: number): Promise<{ archived: boolean }> {
    const [appointments, commissions] = await Promise.all([
      prisma.appointment.count({ where: { professionalId: id } }),
      prisma.commission.count({ where: { professionalId: id } }),
    ]);
    if (appointments || commissions) {
      await prisma.professional.update({ where: { id }, data: { active: false } });
      return { archived: true };
    }
    await prisma.professional.delete({ where: { id } });
    return { archived: false };
  }
}
