import type { ServiceInput } from "../../dtos/services/service.dto.js";
import { NotFoundError } from "../../exceptions/DomainErrors.js";
import type { IServiceRepository } from "../../repositories/interfaces/IServiceRepository.js";

export class UpdateServiceUseCase {
  constructor(private readonly services: IServiceRepository) {}

  async execute(id: number, input: ServiceInput) {
    if (!(await this.services.findById(id))) throw new NotFoundError("Serviço não encontrado.");
    return this.services.update(id, input);
  }
}
