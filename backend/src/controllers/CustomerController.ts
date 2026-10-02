import type { Request, Response } from "express";
import { customerListSchema, customerSchema } from "../dtos/customers/customer.dto.js";
import { CreateCustomerUseCase } from "../useCases/customers/CreateCustomerUseCase.js";
import { ListCustomersUseCase } from "../useCases/customers/ListCustomersUseCase.js";
import { UpdateCustomerUseCase } from "../useCases/customers/UpdateCustomerUseCase.js";
import { paginationMeta } from "../utils/pagination.js";

export class CustomerController {
  constructor(
    private readonly listCustomers: ListCustomersUseCase,
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly updateCustomer: UpdateCustomerUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = customerListSchema.parse(req.query);
    const result = await this.listCustomers.execute(query);
    const data = result.rows.map(({ active, ...customer }) => ({ ...customer, active: Number(active) }));
    if (req.originalUrl.startsWith("/api/")) {
      res.json({ data, meta: paginationMeta(query.page, query.limit, result.total) });
      return;
    }
    res.json(data);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.createCustomer.execute(customerSchema.parse(req.body)));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    res.json(await this.updateCustomer.execute(id, customerSchema.parse(req.body)));
  };
}
