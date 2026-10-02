export interface IRefreshTokenRepository {
  store(userId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  consume(userId: number, tokenHash: string, now: Date): Promise<boolean>;
  revoke(tokenHash: string, now: Date): Promise<void>;
  revokeAll(userId: number, now: Date): Promise<void>;
}
