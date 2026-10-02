export class UpdateCustomerUseCase {
    customers;
    constructor(customers) {
        this.customers = customers;
    }
    execute(id, input) {
        return this.customers.update(id, input);
    }
}
