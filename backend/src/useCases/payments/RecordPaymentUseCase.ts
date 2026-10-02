import type { PaymentMethod } from "@prisma/client";
import type { IPaymentRepository } from "../../repositories/interfaces/IPaymentRepository.js";

export class RecordPaymentUseCase {
  constructor(private readonly payments: IPaymentRepository) {}
  execute(input: { appointment_id: number; amount: number; method: PaymentMethod; request_key: string; actorId: number }) {
    return this.payments.record({
      appointmentId: input.appointment_id,
      amount: input.amount,
      method: input.method,
      requestKey: input.request_key,
      actorId: input.actorId,
    });
  }
}
