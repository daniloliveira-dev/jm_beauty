import type { ProfessionalInput } from "../../dtos/professionals/professional.dto.js";

export interface IProfessionalRepository {
  list(activeOnly: boolean): Promise<Array<{
    id: number; name: string; phone: string; email: string | null;
    specialty: string; active: boolean; serviceIds: number[];
  }>>;
  save(input: ProfessionalInput, id?: number): Promise<{
    id: number; name: string; phone: string; email: string | null;
    specialty: string; active: boolean; serviceIds: number[];
  }>;
  delete(id: number): Promise<{ archived: boolean }>;
}
