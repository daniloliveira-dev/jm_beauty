import type { ProfessionalInput } from "../../dtos/professionals/professional.dto.js";
import type { IProfessionalRepository } from "../../repositories/interfaces/IProfessionalRepository.js";

export class SaveProfessionalUseCase {
  constructor(private readonly professionals: IProfessionalRepository) {}
  execute(input: ProfessionalInput, id?: number) {
    return this.professionals.save(input, id);
  }
}
