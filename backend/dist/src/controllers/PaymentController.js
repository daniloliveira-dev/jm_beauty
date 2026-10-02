import { paymentSchema, refundSchema, legacyMethod, toPaymentMethod } from "../dtos/payments/payment.dto.js";
import { AppError } from "../exceptions/AppError.js";
export class PaymentController {
    recordPayment;
    refundPayment;
    constructor(recordPayment, refundPayment) {
        this.recordPayment = recordPayment;
        this.refundPayment = refundPayment;
    }
    record = async (req, res) => {
        const input = paymentSchema.parse(req.body);
        const payment = await this.recordPayment.execute({
            ...input,
            method: toPaymentMethod(input.method),
            actorId: this.actorId(req),
        });
        res.status(201).json({ ...payment, method: legacyMethod(payment.method) });
    };
    refund = async (req, res) => {
        const input = refundSchema.parse(req.body);
        await this.refundPayment.execute({ ...input, actorId: this.actorId(req) });
        res.status(201).json({ success: true });
    };
    actorId(req) {
        if (!req.auth)
            throw new AppError("Autenticação necessária.", 401);
        return req.auth.userId;
    }
}
