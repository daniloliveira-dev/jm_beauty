import type { Request, Response } from "express";
import { paymentSchema, refundSchema, legacyMethod, toPaymentMethod } from "../dtos/payments/payment.dto.js";
import { AppError } from "../exceptions/AppError.js";
import { RecordPaymentUseCase } from "../useCases/payments/RecordPaymentUseCase.js";
import { RefundPaymentUseCase } from "../useCases/payments/RefundPaymentUseCase.js";

export class PaymentController {
  constructor(
    private readonly recordPayment: RecordPaymentUseCase,
    private readonly refundPayment: RefundPaymentUseCase,
  ) {}

  record = async (req: Request, res: Response): Promise<void> => {
    const input = paymentSchema.parse(req.body);
    const payment = await this.recordPayment.execute({
      ...input,
      method: toPaymentMethod(input.method),
      actorId: this.actorId(req),
    });
    res.status(201).json({ ...payment, method: legacyMethod(payment.method) });
  };

  refund = async (req: Request, res: Response): Promise<void> => {
    const input = refundSchema.parse(req.body);
    await this.refundPayment.execute({ ...input, actorId: this.actorId(req) });
    res.status(201).json({ success: true });
  };

  private actorId(req: Request): number {
    if (!req.auth) throw new AppError("Autenticação necessária.", 401);
    return req.auth.userId;
  }
}
