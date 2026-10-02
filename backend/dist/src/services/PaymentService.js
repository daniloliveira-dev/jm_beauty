import { ConflictError, ValidationError } from "../exceptions/DomainErrors.js";
export class PaymentService {
    assertRequestKeyMatches(existing, input) {
        if (existing.appointmentId !== input.appointmentId || existing.amount !== input.amount || existing.method !== input.method)
            throw new ConflictError("Chave já utilizada com outros dados.");
    }
    assertWithinBalance(paid, amount, total) {
        if (!Number.isSafeInteger(amount) || amount <= 0 || paid + amount > total)
            throw new ValidationError("Valor superior ao saldo pendente.");
    }
    assertRefundWithinPayment(refunded, amount, paid) {
        if (amount <= 0 || refunded + amount > paid)
            throw new ValidationError("Estorno superior ao pagamento.");
    }
}
