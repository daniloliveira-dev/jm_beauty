export interface IPasswordResetRepository {
  deletePendingForUser(userId: number): Promise<void>;
  create(userId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  findValid(tokenHash: string, now: Date): Promise<{ id: number; userId: number } | null>;
  complete(resetId: number, userId: number, passwordHash: string, now: Date): Promise<void>;
}
