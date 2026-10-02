import type { IPaymentRepository } from "../../repositories/interfaces/IPaymentRepository.js";

export class RefundPaymentUseCase {
  constructor(private readonly payments: IPaymentRepository) {}
  execute(input: { payment_id: number; amount: number; reason: string; request_key: string; actorId: number }) {
    return this.payments.refund({
      paymentId: input.payment_id,
      amount: input.amount,
      reason: input.reason,
      requestKey: input.request_key,
      actorId: input.actorId,
    });
  }
}
