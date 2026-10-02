import type { CustomerInput } from "../../dtos/customers/customer.dto.js";
import type { Customer } from "@prisma/client";

export interface ICustomerRepository {
  list(options: { skip: number; take: number; search?: string }): Promise<{ rows: Customer[]; total: number }>;
  create(input: CustomerInput): Promise<Customer>;
  update(id: number, input: CustomerInput): Promise<Customer>;
}
