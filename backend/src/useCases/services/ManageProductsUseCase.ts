import type { ProductInput } from "../../dtos/services/product.dto.js";
import type { IOrderRepository } from "../../repositories/interfaces/IOrderRepository.js";

export class ManageProductsUseCase {
  constructor(private readonly orders: IOrderRepository) {}
  list() { return this.orders.listProducts(); }
  create(input: ProductInput) { return this.orders.createProduct(input); }
  update(id: number, input: ProductInput) { return this.orders.updateProduct(id, input); }
}
