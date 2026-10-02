import { createHash } from "node:crypto";
import { AuthenticationError } from "../../exceptions/DomainErrors.js";
import type { IPasswordResetRepository } from "../../repositories/interfaces/IPasswordResetRepository.js";
import { PasswordService } from "../../utils/password.js";

export class ResetPasswordUseCase {
  constructor(private readonly resets: IPasswordResetRepository, private readonly passwords: PasswordService) {}
  async execute(token: string, password: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const reset = await this.resets.findValid(tokenHash, new Date());
    if (!reset) throw new AuthenticationError("Código inválido ou expirado.");
    await this.resets.complete(reset.id, reset.userId, await this.passwords.hash(password), new Date());
    return { message: "Senha alterada. Entre com sua nova senha." };
  }
}
