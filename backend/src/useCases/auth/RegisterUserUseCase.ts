import { Prisma, UserRole, type User } from "@prisma/client";
import type { RegisterUserDTO } from "../../dtos/auth/auth.dto.js";
import { ConflictError } from "../../exceptions/DomainErrors.js";
import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";
import { PasswordService } from "../../utils/password.js";
import { AuthService } from "../../services/AuthService.js";

export class RegisterUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly passwords: PasswordService,
    private readonly auth: AuthService,
  ) {}

  async execute(input: RegisterUserDTO) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.findByEmail(email))
      throw new ConflictError("E-mail já cadastrado.");

    let user: User;
    try {
      user = await this.users.create({
        name: input.name.trim(),
        email,
        phone: input.phone,
        passwordHash: await this.passwords.hash(input.password),
        role: UserRole.USER,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictError("E-mail já cadastrado.");
      throw error;
    }

    return this.auth.issueSession(user);
  }
}
