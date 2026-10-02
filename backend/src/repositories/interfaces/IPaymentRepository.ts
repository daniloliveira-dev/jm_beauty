import type { PaymentMethod } from "@prisma/client";

export type RecordedPayment = { id: number; appointment_id: number; amount: number; method: PaymentMethod };

export interface IPaymentRepository {
  record(input: { appointmentId: number; amount: number; method: PaymentMethod; requestKey: string; actorId: number }): Promise<RecordedPayment>;
  refund(input: { paymentId: number; amount: number; reason: string; requestKey: string; actorId: number }): Promise<void>;
}
