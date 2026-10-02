import { z } from "zod";
export const forgotPasswordSchema = z.object({ email: z.email().trim().toLowerCase() });
export const resetPasswordSchema = z.object({ token: z.string().length(64), password: z.string().min(10).max(128) });
