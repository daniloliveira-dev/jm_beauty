import type { IRefreshTokenRepository } from "../../repositories/interfaces/IRefreshTokenRepository.js";
import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";
import { AuthenticationError } from "../../exceptions/DomainErrors.js";
import { TokenService } from "../../utils/jwt.js";
import { AuthService } from "../../services/AuthService.js";

export class RefreshSessionUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly refreshTokens: IRefreshTokenRepository,
    private readonly tokens: TokenService,
    private readonly auth: AuthService,
  ) {}

  async execute(refreshToken: string) {
    let payload;
    try {
      payload = this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError("Refresh token inválido ou expirado.");
    }
    const userId = Number(payload.sub);
    const tokenHash = this.tokens.hashToken(refreshToken);
    const now = new Date();
    if (!(await this.refreshTokens.consume(userId, tokenHash, now)))
      throw new AuthenticationError("Refresh token revogado.");

    const user = await this.users.findById(userId);
    if (!user || !user.active)
      throw new AuthenticationError("Usuário inativo ou inexistente.");

    return this.auth.issueSession(user);
  }
}
