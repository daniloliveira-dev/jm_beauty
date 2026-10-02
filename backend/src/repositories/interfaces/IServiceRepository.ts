import type { Service } from "@prisma/client";
import type { ServiceInput } from "../../dtos/services/service.dto.js";

export interface IServiceRepository {
  list(options: { skip: number; take: number; search?: string; includeInactive: boolean }): Promise<{ rows: Service[]; total: number }>;
  findById(id: number): Promise<Service | null>;
  create(data: ServiceInput): Promise<Service>;
  update(id: number, data: ServiceInput): Promise<Service>;
  delete(id: number): Promise<{ archived: boolean }>;
}
