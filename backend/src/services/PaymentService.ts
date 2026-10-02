import { ConflictError, ValidationError } from "../exceptions/DomainErrors.js";

export class PaymentService {
  assertRequestKeyMatches(existing: { appointmentId: number; amount: number; method: string }, input: { appointmentId: number; amount: number; method: string }): void {
    if (existing.appointmentId !== input.appointmentId || existing.amount !== input.amount || existing.method !== input.method)
      throw new ConflictError("Chave já utilizada com outros dados.");
  }

  assertWithinBalance(paid: number, amount: number, total: number): void {
    if (!Number.isSafeInteger(amount) || amount <= 0 || paid + amount > total)
      throw new ValidationError("Valor superior ao saldo pendente.");
  }

  assertRefundWithinPayment(refunded: number, amount: number, paid: number): void {
    if (amount <= 0 || refunded + amount > paid)
      throw new ValidationError("Estorno superior ao pagamento.");
  }
}
