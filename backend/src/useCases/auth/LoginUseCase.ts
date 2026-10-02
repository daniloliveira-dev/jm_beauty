import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";
import { AuthenticationError } from "../../exceptions/DomainErrors.js";
import { PasswordService } from "../../utils/password.js";
import { AuthService } from "../../services/AuthService.js";
import type { LoginDTO } from "../../dtos/auth/auth.dto.js";

export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly passwords: PasswordService,
    private readonly auth: AuthService,
  ) {}

  async execute(input: LoginDTO) {
    const user = await this.users.findByEmail(input.email.trim().toLowerCase());
    if (!user || !user.active || !(await this.passwords.verify(input.password, user.passwordHash)))
      throw new AuthenticationError("E-mail ou senha inválidos.");

    if (this.passwords.needsRehash(user.passwordHash))
      await this.users.updatePassword(user.id, await this.passwords.rehash(input.password));

    return this.auth.issueSession(user);
  }
}
