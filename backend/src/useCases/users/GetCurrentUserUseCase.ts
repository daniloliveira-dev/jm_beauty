import { NotFoundError } from "../../exceptions/DomainErrors.js";
import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";
import { toPublicUser } from "../../services/UserService.js";

export class GetCurrentUserUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(id: number) {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    return toPublicUser(user);
  }
}
