import type { User } from "@prisma/client";

export type UserModel = Pick<User, "id" | "name" | "email" | "phone" | "role" | "active" | "createdAt" | "updatedAt">;
export type AuthenticatedUserModel = Pick<User, "id" | "email" | "role" | "active">;
