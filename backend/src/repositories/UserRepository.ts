import type { User } from "@prisma/client";
import { prisma } from "../config/database.js";
import type { IUserRepository, NewUser } from "./interfaces/IUserRepository.js";

export class UserRepository implements IUserRepository {
  findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async create(data: NewUser): Promise<User> {
    return prisma.user.create({ data });
  }

  updateProfile(id: number, data: Pick<User, "name" | "phone">): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  updateAccess(id: number, data: Pick<User, "role" | "active">): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async deactivate(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { active: false, name: "Usuário removido", email: `deleted-${id}@invalid.local`, phone: "", passwordHash: "disabled-account" },
      });
      await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    });
  }

  async list(options: { skip: number; take: number; search?: string }) {
    const where = options.search
      ? {
          OR: [
            { name: { contains: options.search } },
            { email: { contains: options.search } },
            { phone: { contains: options.search } },
          ],
        }
      : {};
    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
          updatedAt: true,
          passwordHash: false,
        },
        orderBy: { name: "asc" },
        skip: options.skip,
        take: options.take,
      }),
      prisma.user.count({ where }),
    ]);
    return { rows, total };
  }

  countActiveAdmins(): Promise<number> {
    return prisma.user.count({ where: { role: "ADMIN", active: true } });
  }
}
