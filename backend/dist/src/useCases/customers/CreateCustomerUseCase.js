export class CreateCustomerUseCase {
    customers;
    constructor(customers) {
        this.customers = customers;
    }
    execute(input) {
        return this.customers.create(input);
    }
}
