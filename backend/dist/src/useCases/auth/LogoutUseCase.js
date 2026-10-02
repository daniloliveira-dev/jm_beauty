export class LogoutUseCase {
    refreshTokens;
    tokens;
    constructor(refreshTokens, tokens) {
        this.refreshTokens = refreshTokens;
        this.tokens = tokens;
    }
    async execute(refreshToken, userId) {
        const now = new Date();
        if (!refreshToken)
            return this.refreshTokens.revokeAll(userId, now);
        try {
            const payload = this.tokens.verifyRefreshToken(refreshToken);
            if (Number(payload.sub) === userId)
                await this.refreshTokens.revoke(this.tokens.hashToken(refreshToken), now);
        }
        catch {
            // Logout permanece idempotente mesmo quando o token já expirou.
        }
    }
}
