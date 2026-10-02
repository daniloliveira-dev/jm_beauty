import type { UserRole } from "@prisma/client";
import type { IProfessionalRepository } from "../../repositories/interfaces/IProfessionalRepository.js";

export class ListProfessionalsUseCase {
  constructor(private readonly professionals: IProfessionalRepository) {}
  execute(role: UserRole) {
    return this.professionals.list(role === "USER");
  }
}
