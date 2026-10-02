import { z } from "zod";
const activeInput = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean);
export const productSchema = z.object({
    name: z.string().trim().min(2).max(100),
    price: z.number().int().min(0),
    stock: z.number().int().min(0),
    minimum: z.number().int().min(0).default(3),
    active: activeInput.default(true),
});
export const orderItemSchema = z.object({
    kind: z.enum(["produto", "servico"]),
    item_id: z.number().int().positive(),
    quantity: z.number().int().positive().max(100).default(1),
});
export const orderAdjustmentSchema = z.object({
    discount: z.number().int().min(0),
    extra: z.number().int().min(0),
    reason: z.string().trim().min(3).max(200),
});
