import type { ProductInput, OrderItemInput, OrderAdjustmentInput } from "../../dtos/services/product.dto.js";
import type { Product } from "@prisma/client";

export interface IOrderRepository {
  listProducts(): Promise<Product[]>;
  createProduct(input: ProductInput): Promise<Product>;
  updateProduct(id: number, input: ProductInput): Promise<Product>;
  getOrder(appointmentId: number): Promise<unknown>;
  addItem(appointmentId: number, input: OrderItemInput): Promise<void>;
  removeProductItem(appointmentId: number, itemId: number): Promise<void>;
  setAdjustment(appointmentId: number, input: OrderAdjustmentInput): Promise<void>;
}
