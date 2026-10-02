import { prisma } from "../config/database.js";
export class ServiceRepository {
    async list(options) {
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
    findById(id) {
        return prisma.service.findUnique({ where: { id } });
    }
    create(data) {
        return prisma.service.create({ data });
    }
    update(id, data) {
        return prisma.service.update({ where: { id }, data });
    }
}
