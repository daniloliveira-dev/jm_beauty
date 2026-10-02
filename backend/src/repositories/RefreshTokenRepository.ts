import { prisma } from "../config/database.js";
import type { IRefreshTokenRepository } from "./interfaces/IRefreshTokenRepository.js";

export class RefreshTokenRepository implements IRefreshTokenRepository {
  async store(userId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }

  async consume(userId: number, tokenHash: string, now: Date): Promise<boolean> {
    const result = await prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    });
    return result.count === 1;
  }

  async revoke(tokenHash: string, now: Date): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: now },
    });
  }

  async revokeAll(userId: number, now: Date): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
