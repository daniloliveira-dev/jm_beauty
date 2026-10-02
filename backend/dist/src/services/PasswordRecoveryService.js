import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { AppError } from "../exceptions/AppError.js";
export class PasswordRecoveryService {
    ensureConfigured() {
        if (!env.SMTP_HOST || !env.SMTP_FROM)
            throw new AppError("Recuperação por e-mail não configurada. Entre em contato com o salão.", 503, "EMAIL_NOT_CONFIGURED");
    }
    async send(email, token) {
        this.ensureConfigured();
        const transport = nodemailer.createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_PORT === 465,
            auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
        });
        await transport.sendMail({
            from: env.SMTP_FROM,
            to: email,
            subject: "Recuperação de senha · JM Beauty",
            text: `Seu código de recuperação (válido por 30 minutos): ${token}\nAbra o app JM Beauty e informe este código.`,
        });
    }
}
