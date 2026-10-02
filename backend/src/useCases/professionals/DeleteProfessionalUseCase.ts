import { NotFoundError } from "../../exceptions/DomainErrors.js";
import type { IProfessionalRepository } from "../../repositories/interfaces/IProfessionalRepository.js";

export class DeleteProfessionalUseCase {
  constructor(private readonly professionals: IProfessionalRepository) {}
  async execute(id: number) {
    if (!Number.isSafeInteger(id) || id < 1) throw new NotFoundError("Profissional não encontrado.");
    const professional = (await this.professionals.list(false)).find((item) => item.id === id);
    if (!professional) throw new NotFoundError("Profissional não encontrado.");
    return this.professionals.delete(id);
  }
}