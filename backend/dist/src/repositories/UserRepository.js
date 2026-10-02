import { prisma } from "../config/database.js";
export class UserRepository {
    findByEmail(email) {
        return prisma.user.findUnique({ where: { email } });
    }
    findById(id) {
        return prisma.user.findUnique({ where: { id } });
    }
    async create(data) {
        return prisma.user.create({ data });
    }
    updateProfile(id, data) {
        return prisma.user.update({ where: { id }, data });
    }
    async updatePassword(id, passwordHash) {
        await prisma.user.update({ where: { id }, data: { passwordHash } });
    }
    updateAccess(id, data) {
        return prisma.user.update({ where: { id }, data });
    }
    async deactivate(id) {
        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: { active: false, name: "Usuário removido", email: `deleted-${id}@invalid.local`, phone: "", passwordHash: "disabled-account" },
            });
            await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
        });
    }
    async list(options) {
        const where = options.search
            ? {
                OR: [
                    { name: { contains: options.search } },
                    { email: { contains: options.search } },
                    { phone: { contains: options.search } },
                ],
            }
            : {};
        const [rows, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    role: true,
                    active: true,
                    createdAt: true,
                    updatedAt: true,
                    passwordHash: false,
                },
                orderBy: { name: "asc" },
                skip: options.skip,
                take: options.take,
            }),
            prisma.user.count({ where }),
        ]);
        return { rows, total };
    }
    countActiveAdmins() {
        return prisma.user.count({ where: { role: "ADMIN", active: true } });
    }
}
