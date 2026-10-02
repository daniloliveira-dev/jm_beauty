import { UserRole } from "@prisma/client";
import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).default(""),
});

export const createManagedUserSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  phone: z.string().trim().max(30).default(""),
  password: z.string().min(10).max(128),
  role: z.enum(["user", "operator"]).transform((role) => role === "operator" ? UserRole.OPERATOR : UserRole.USER),
});

export const updateAccessSchema = z.object({
  role: z.enum(["user", "operator", "admin"]).transform((role) => ({ user: UserRole.USER, operator: UserRole.OPERATOR, admin: UserRole.ADMIN })[role]),
  active: z.boolean(),
});

export const userListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
export type CreateManagedUserDTO = z.infer<typeof createManagedUserSchema>;
export type UpdateAccessDTO = z.infer<typeof updateAccessSchema>;
