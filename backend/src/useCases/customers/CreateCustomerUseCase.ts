import type { CustomerInput } from "../../dtos/customers/customer.dto.js";
import type { ICustomerRepository } from "../../repositories/interfaces/ICustomerRepository.js";

export class CreateCustomerUseCase {
  constructor(private readonly customers: ICustomerRepository) {}
  execute(input: CustomerInput) {
    return this.customers.create(input);
  }
}
