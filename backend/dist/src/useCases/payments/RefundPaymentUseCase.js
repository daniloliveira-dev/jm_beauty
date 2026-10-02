export class RefundPaymentUseCase {
    payments;
    constructor(payments) {
        this.payments = payments;
    }
    execute(input) {
        return this.payments.refund({
            paymentId: input.payment_id,
            amount: input.amount,
            reason: input.reason,
            requestKey: input.request_key,
            actorId: input.actorId,
        });
    }
}
