import type { ServiceInput } from "../../dtos/services/service.dto.js";
import type { IServiceRepository } from "../../repositories/interfaces/IServiceRepository.js";

export class CreateServiceUseCase {
  constructor(private readonly services: IServiceRepository) {}

  execute(input: ServiceInput) {
    return this.services.create(input);
  }
}
