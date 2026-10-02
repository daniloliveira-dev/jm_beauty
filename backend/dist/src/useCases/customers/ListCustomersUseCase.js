export class ListCustomersUseCase {
    customers;
    constructor(customers) {
        this.customers = customers;
    }
    execute(input) {
        return this.customers.list({ skip: (input.page - 1) * input.limit, take: input.limit, search: input.search });
    }
}
