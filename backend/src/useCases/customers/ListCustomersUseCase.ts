import type { ICustomerRepository } from "../../repositories/interfaces/ICustomerRepository.js";

export class ListCustomersUseCase {
  constructor(private readonly customers: ICustomerRepository) {}
  execute(input: { page: number; limit: number; search?: string }) {
    return this.customers.list({ skip: (input.page - 1) * input.limit, take: input.limit, search: input.search });
  }
}
