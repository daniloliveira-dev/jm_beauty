import type { User } from "@prisma/client";
import type { IRefreshTokenRepository } from "../repositories/interfaces/IRefreshTokenRepository.js";
import { TokenService } from "../utils/jwt.js";
import { authResult } from "../useCases/auth/AuthResult.js";

export class AuthService {
  constructor(
    private readonly tokens: TokenService,
    private readonly refreshTokens: IRefreshTokenRepository,
  ) {}

  async issueSession(user: User) {
    const accessToken = this.tokens.createAccessToken(user);
    const refreshToken = this.tokens.createRefreshToken(user);
    const payload = this.tokens.verifyRefreshToken(refreshToken);
    await this.refreshTokens.store(
      user.id,
      this.tokens.hashToken(refreshToken),
      new Date((payload.exp ?? 0) * 1000),
    );
    return authResult(user, accessToken, refreshToken);
  }
}
