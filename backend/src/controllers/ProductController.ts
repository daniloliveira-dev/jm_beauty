import type { Request, Response } from "express";
import { productSchema } from "../dtos/services/product.dto.js";
import { ManageProductsUseCase } from "../useCases/services/ManageProductsUseCase.js";

export class ProductController {
  constructor(private readonly products: ManageProductsUseCase) {}
  list = async (_req: Request, res: Response): Promise<void> => {
    const rows = await this.products.list();
    res.json(rows.map((row) => ({ ...row, active: Number(row.active) })));
  };
  create = async (req: Request, res: Response): Promise<void> => {
    const input = productSchema.parse(req.body);
    const product = await this.products.create(input);
    res.status(201).json({ ...product, active: Number(product.active) });
  };
  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    const input = productSchema.parse(req.body);
    const product = await this.products.update(id, input);
    res.json({ ...product, active: Number(product.active) });
  };
}
