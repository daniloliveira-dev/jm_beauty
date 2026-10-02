import { Prisma } from "@prisma/client";
import type { CreateManagedUserDTO } from "../../dtos/users/user.dto.js";
import { ConflictError } from "../../exceptions/DomainErrors.js";
import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";
import { PasswordService } from "../../utils/password.js";
import { toPublicUser } from "../../services/UserService.js";

export class CreateManagedUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly passwords: PasswordService,
  ) {}

  async execute(input: CreateManagedUserDTO) {
    if (await this.users.findByEmail(input.email)) throw new ConflictError("E-mail já cadastrado.");
    try {
      const user = await this.users.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash: await this.passwords.hash(input.password),
        role: input.role,
      });
      return toPublicUser(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
        throw new ConflictError("E-mail já cadastrado.");
      throw error;
    }
  }
}
