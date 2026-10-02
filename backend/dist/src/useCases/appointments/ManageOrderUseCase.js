export class ManageOrderUseCase {
    orders;
    constructor(orders) {
        this.orders = orders;
    }
    get(appointmentId) { return this.orders.getOrder(appointmentId); }
    addItem(appointmentId, input) { return this.orders.addItem(appointmentId, input); }
    removeProduct(appointmentId, itemId) { return this.orders.removeProductItem(appointmentId, itemId); }
    adjust(appointmentId, input) { return this.orders.setAdjustment(appointmentId, input); }
}
