import type { OrderAdjustmentInput, OrderItemInput } from "../../dtos/services/product.dto.js";
import type { IOrderRepository } from "../../repositories/interfaces/IOrderRepository.js";

export class ManageOrderUseCase {
  constructor(private readonly orders: IOrderRepository) {}
  get(appointmentId: number) { return this.orders.getOrder(appointmentId); }
  addItem(appointmentId: number, input: OrderItemInput) { return this.orders.addItem(appointmentId, input); }
  removeProduct(appointmentId: number, itemId: number) { return this.orders.removeProductItem(appointmentId, itemId); }
  adjust(appointmentId: number, input: OrderAdjustmentInput) { return this.orders.setAdjustment(appointmentId, input); }
}
