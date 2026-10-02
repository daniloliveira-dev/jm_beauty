import { productSchema } from "../dtos/services/product.dto.js";
export class ProductController {
    products;
    constructor(products) {
        this.products = products;
    }
    list = async (_req, res) => {
        const rows = await this.products.list();
        res.json(rows.map((row) => ({ ...row, active: Number(row.active) })));
    };
    create = async (req, res) => {
        const input = productSchema.parse(req.body);
        const product = await this.products.create(input);
        res.status(201).json({ ...product, active: Number(product.active) });
    };
    update = async (req, res) => {
        const id = Number(req.params.id);
        const input = productSchema.parse(req.body);
        const product = await this.products.update(id, input);
        res.json({ ...product, active: Number(product.active) });
    };
}
