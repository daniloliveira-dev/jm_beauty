import { createHash, randomBytes } from "node:crypto";
export class RequestPasswordResetUseCase {
    users;
    resets;
    mail;
    constructor(users, resets, mail) {
        this.users = users;
        this.resets = resets;
        this.mail = mail;
    }
    async execute(email) {
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
