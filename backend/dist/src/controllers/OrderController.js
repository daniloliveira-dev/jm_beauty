import { orderAdjustmentSchema, orderItemSchema } from "../dtos/services/product.dto.js";
export class OrderController {
    orders;
    constructor(orders) {
        this.orders = orders;
    }
    get = async (req, res) => {
        res.json(await this.orders.get(Number(req.params.id)));
    };
    addItem = async (req, res) => {
        await this.orders.addItem(Number(req.params.id), orderItemSchema.parse(req.body));
        res.status(201).json({ success: true });
    };
    removeItem = async (req, res) => {
        await this.orders.removeProduct(Number(req.params.id), Number(req.params.item));
        res.json({ success: true });
    };
    adjust = async (req, res) => {
        await this.orders.adjust(Number(req.params.id), orderAdjustmentSchema.parse(req.body));
        res.json({ success: true });
    };
}
