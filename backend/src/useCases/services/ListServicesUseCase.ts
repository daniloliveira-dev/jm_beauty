import type { UserRole } from "@prisma/client";
import type { IServiceRepository } from "../../repositories/interfaces/IServiceRepository.js";

export class ListServicesUseCase {
  constructor(private readonly services: IServiceRepository) {}

  execute(input: { page: number; limit: number; search?: string; role: UserRole }) {
    return this.services.list({
      skip: (input.page - 1) * input.limit,
      take: input.limit,
      search: input.search,
      includeInactive: input.role !== "USER",
    });
  }
}
