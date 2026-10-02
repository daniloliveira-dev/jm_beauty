import type { IUserRepository } from "../../repositories/interfaces/IUserRepository.js";
import { toPublicUser } from "../../services/UserService.js";

export class ListUsersUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(input: { page: number; limit: number; search?: string }) {
    const result = await this.users.list({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      search: input.search,
    });
    return { rows: result.rows.map(toPublicUser), total: result.total };
  }
}
