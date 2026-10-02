import type { User, UserRole } from "@prisma/client";

export type NewUser = Pick<User, "name" | "email" | "phone" | "passwordHash"> & {
  role?: UserRole;
};
export type PublicUserRecord = Pick<
  User,
  "id" | "name" | "email" | "phone" | "role" | "active" | "createdAt" | "updatedAt"
>;

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<User | null>;
  create(data: NewUser): Promise<User>;
  updateProfile(id: number, data: Pick<User, "name" | "phone">): Promise<User>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
  updateAccess(id: number, data: Pick<User, "role" | "active">): Promise<User>;
  deactivate(id: number): Promise<void>;
  list(options: { skip: number; take: number; search?: string }): Promise<{ rows: PublicUserRecord[]; total: number }>;
  countActiveAdmins(): Promise<number>;
}
