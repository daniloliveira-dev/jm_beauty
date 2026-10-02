import { NotFoundError } from "../../exceptions/DomainErrors.js";
import type { IServiceRepository } from "../../repositories/interfaces/IServiceRepository.js";

export class DeleteServiceUseCase {
  constructor(private readonly services: IServiceRepository) {}
  async execute(id: number) {
    if (!(await this.services.findById(id))) throw new NotFoundError("Serviço não encontrado.");
    return this.services.delete(id);
  }
}