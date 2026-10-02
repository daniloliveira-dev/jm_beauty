import { prisma } from "../config/database.js";
export class PasswordResetRepository {
    async deletePendingForUser(userId) {
        await prisma.passwordReset.deleteMany({ where: { userId, usedAt: null } });
    }
    async create(userId, tokenHash, expiresAt) {
        await prisma.passwordReset.create({ data: { userId, tokenHash, expiresAt } });
    }
    findValid(tokenHash, now) {
        return prisma.passwordReset.findFirst({
            where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
            select: { id: true, userId: true },
        });
    }
    async complete(resetId, userId, passwordHash, now) {
        await prisma.$transaction(async (tx) => {
            await tx.user.update({ where: { id: userId }, data: { passwordHash } });
            await tx.passwordReset.update({ where: { id: resetId }, data: { usedAt: now } });
            await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
        });
    }
}
