export class RecordPaymentUseCase {
    payments;
    constructor(payments) {
        this.payments = payments;
    }
    execute(input) {
        return this.payments.record({
            appointmentId: input.appointment_id,
            amount: input.amount,
            method: input.method,
            requestKey: input.request_key,
            actorId: input.actorId,
        });
    }
}
