import { ConflictError, NotFoundError } from "../../exceptions/DomainErrors.js";
import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";

export class DeleteUserUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(id: number): Promise<void> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError("Usuário não encontrado.");
    if (user.active && user.role === "ADMIN" && (await this.users.countActiveAdmins()) <= 1)
      throw new ConflictError("Não é permitido remover o último administrador ativo.");
    await this.users.deactivate(id);
  }
}
