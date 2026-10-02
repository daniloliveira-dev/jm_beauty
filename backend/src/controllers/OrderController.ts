import type { Request, Response } from "express";
import { orderAdjustmentSchema, orderItemSchema } from "../dtos/services/product.dto.js";
import { ManageOrderUseCase } from "../useCases/appointments/ManageOrderUseCase.js";

export class OrderController {
  constructor(private readonly orders: ManageOrderUseCase) {}
  get = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.orders.get(Number(req.params.id)));
  };
  addItem = async (req: Request, res: Response): Promise<void> => {
    await this.orders.addItem(Number(req.params.id), orderItemSchema.parse(req.body));
    res.status(201).json({ success: true });
  };
  removeItem = async (req: Request, res: Response): Promise<void> => {
    await this.orders.removeProduct(Number(req.params.id), Number(req.params.item));
    res.json({ success: true });
  };
  adjust = async (req: Request, res: Response): Promise<void> => {
    await this.orders.adjust(Number(req.params.id), orderAdjustmentSchema.parse(req.body));
    res.json({ success: true });
  };
}
