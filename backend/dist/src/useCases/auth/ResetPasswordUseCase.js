import { createHash } from "node:crypto";
import { AuthenticationError } from "../../exceptions/DomainErrors.js";
export class ResetPasswordUseCase {
    resets;
    passwords;
    constructor(resets, passwords) {
        this.resets = resets;
        this.passwords = passwords;
    }
    async execute(token, password) {
        const tokenHash = createHash("sha256").update(token).digest("hex");
        const reset = await this.resets.findValid(tokenHash, new Date());
        if (!reset)
            throw new AuthenticationError("Código inválido ou expirado.");
        await this.resets.complete(reset.id, reset.userId, await this.passwords.hash(password), new Date());
        return { message: "Senha alterada. Entre com sua nova senha." };
    }
}
