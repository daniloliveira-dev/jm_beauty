import { createHash, randomBytes } from "node:crypto";
import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";
import type { IPasswordResetRepository } from "../../repositories/interfaces/IPasswordResetRepository.js";
import { PasswordRecoveryService } from "../../services/PasswordRecoveryService.js";

export class RequestPasswordResetUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly resets: IPasswordResetRepository,
    private readonly mail: PasswordRecoveryService,
  ) {}

  async execute(email: string) {
    this.mail.ensureConfigured();
    const user = await this.users.findByEmail(email);
    if (user?.active) {
      const token = randomBytes(32).toString("hex");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await this.resets.deletePendingForUser(user.id);
      await this.resets.create(user.id, tokenHash, new Date(Date.now() + 30 * 60_000));
      await this.mail.send(user.email, token);
    }
    return { message: "Se o e-mail estiver cadastrado, você receberá um código de recuperação." };
  }
}
