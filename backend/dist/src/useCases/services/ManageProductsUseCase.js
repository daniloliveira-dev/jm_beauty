export class ManageProductsUseCase {
    orders;
    constructor(orders) {
        this.orders = orders;
    }
    list() { return this.orders.listProducts(); }
    create(input) { return this.orders.createProduct(input); }
    update(id, input) { return this.orders.updateProduct(id, input); }
}
