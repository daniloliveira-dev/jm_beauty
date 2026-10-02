import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().max(30).default(""),
  password: z.string().min(10).max(128),
});

export const loginSchema = z.object({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({ refreshToken: z.string().min(32).max(4096) });

export type RegisterUserDTO = z.infer<typeof registerSchema>;
export type LoginDTO = z.infer<typeof loginSchema>;
