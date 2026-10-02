import type { IRefreshTokenRepository } from "../../repositories/interfaces/IRefreshTokenRepository.js";
import { TokenService } from "../../utils/jwt.js";

export class LogoutUseCase {
  constructor(
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly tokens: TokenService,
  ) {}

  async execute(refreshToken: string | undefined, userId: number): Promise<void> {
    const now = new Date();
    if (!refreshToken) return this.refreshTokens.revokeAll(userId, now);
    try {
      const payload = this.tokens.verifyRefreshToken(refreshToken);
      if (Number(payload.sub) === userId)
        await this.refreshTokens.revoke(this.tokens.hashToken(refreshToken), now);
    } catch {
      // Logout permanece idempotente mesmo quando o token já expirou.
    }
  }
}
