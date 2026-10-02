import "dotenv/config";
import { z } from "zod";
const environmentSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3333),
    DATABASE_URL: z.string().startsWith("mysql://"),
    JWT_SECRET: z.string().min(32),
    JWT_EXPIRES_IN: z.string().default("15m"),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
    CORS_ORIGIN: z.string().default("http://localhost:8081"),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(180),
    AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().optional(),
    PUSH_ENABLED: z.coerce.boolean().default(false),
    EXPO_ACCESS_TOKEN: z.string().optional(),
});
const parsed = environmentSchema.safeParse(process.env);
if (!parsed.success) {
    const details = parsed.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n");
    throw new Error(`Configuração de ambiente inválida:\n${details}`);
}
export const env = parsed.data;
