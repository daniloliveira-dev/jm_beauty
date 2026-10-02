import { customerListSchema, customerSchema } from "../dtos/customers/customer.dto.js";
import { paginationMeta } from "../utils/pagination.js";
export class CustomerController {
    listCustomers;
    createCustomer;
    updateCustomer;
    constructor(listCustomers, createCustomer, updateCustomer) {
        this.listCustomers = listCustomers;
        this.createCustomer = createCustomer;
        this.updateCustomer = updateCustomer;
    }
    list = async (req, res) => {
        const query = customerListSchema.parse(req.query);
        const result = await this.listCustomers.execute(query);
        const data = result.rows.map(({ active, ...customer }) => ({ ...customer, active: Number(active) }));
        if (req.originalUrl.startsWith("/api/")) {
            res.json({ data, meta: paginationMeta(query.page, query.limit, result.total) });
            return;
        }
        res.json(data);
    };
    create = async (req, res) => {
        res.status(201).json(await this.createCustomer.execute(customerSchema.parse(req.body)));
    };
    update = async (req, res) => {
        const id = Number(req.params.id);
        res.json(await this.updateCustomer.execute(id, customerSchema.parse(req.body)));
    };
}
