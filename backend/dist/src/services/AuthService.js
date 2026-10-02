import { authResult } from "../useCases/auth/AuthResult.js";
export class AuthService {
    tokens;
    refreshTokens;
    constructor(tokens, refreshTokens) {
        this.tokens = tokens;
        this.refreshTokens = refreshTokens;
    }
    async issueSession(user) {
        const accessToken = this.tokens.createAccessToken(user);
        const refreshToken = this.tokens.createRefreshToken(user);
        const payload = this.tokens.verifyRefreshToken(refreshToken);
        await this.refreshTokens.store(user.id, this.tokens.hashToken(refreshToken), new Date((payload.exp ?? 0) * 1000));
        return authResult(user, accessToken, refreshToken);
    }
}
