import { prisma } from "../config/database.js";
import type { IPasswordResetRepository } from "./interfaces/IPasswordResetRepository.js";

export class PasswordResetRepository implements IPasswordResetRepository {
  async deletePendingForUser(userId: number): Promise<void> {
    await prisma.passwordReset.deleteMany({ where: { userId, usedAt: null } });
  }
  async create(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.passwordReset.create({ data: { userId, tokenHash, expiresAt } });
  }
  findValid(tokenHash: string, now: Date) {
    return prisma.passwordReset.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
      select: { id: true, userId: true },
    });
  }
  async complete(resetId: number, userId: number, passwordHash: string, now: Date): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.passwordReset.update({ where: { id: resetId }, data: { usedAt: now } });
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    });
  }
}
