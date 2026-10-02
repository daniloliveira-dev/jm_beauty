import type { CustomerInput } from "../../dtos/customers/customer.dto.js";
import type { ICustomerRepository } from "../../repositories/interfaces/ICustomerRepository.js";

export class UpdateCustomerUseCase {
  constructor(private readonly customers: ICustomerRepository) {}
  execute(id: number, input: CustomerInput) {
    return this.customers.update(id, input);
  }
}
