import type { UpdateProfileDTO } from "../../dtos/users/user.dto.js";
import { NotFoundError } from "../../exceptions/DomainErrors.js";
import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";
import { toPublicUser } from "../../services/UserService.js";

export class UpdateProfileUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(id: number, input: UpdateProfileDTO) {
    if (!(await this.users.findById(id))) throw new NotFoundError("Usuário não encontrado.");
    return toPublicUser(await this.users.updateProfile(id, input));
  }
}
