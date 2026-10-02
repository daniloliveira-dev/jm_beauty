import { prisma } from "../config/database.js";
export class RefreshTokenRepository {
    async store(userId, tokenHash, expiresAt) {
        await prisma.refreshToken.create({
            data: { userId, tokenHash, expiresAt },
        });
    }
    async consume(userId, tokenHash, now) {
        const result = await prisma.refreshToken.updateMany({
            where: { userId, tokenHash, revokedAt: null, expiresAt: { gt: now } },
            data: { revokedAt: now },
        });
        return result.count === 1;
    }
    async revoke(tokenHash, now) {
        await prisma.refreshToken.updateMany({
            where: { tokenHash, revokedAt: null },
            data: { revokedAt: now },
        });
    }
    async revokeAll(userId, now) {
        await prisma.refreshToken.updateMany({
            where: { userId, revokedAt: null },
            data: { revokedAt: now },
        });
    }
}
