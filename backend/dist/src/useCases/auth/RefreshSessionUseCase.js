import { AuthenticationError } from "../../exceptions/DomainErrors.js";
export class RefreshSessionUseCase {
    users;
    refreshTokens;
    tokens;
    auth;
    constructor(users, refreshTokens, tokens, auth) {
        this.users = users;
        this.refreshTokens = refreshTokens;
        this.tokens = tokens;
        this.auth = auth;
    }
    async execute(refreshToken) {
        let payload;
        try {
            payload = this.tokens.verifyRefreshToken(refreshToken);
        }
        catch {
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
