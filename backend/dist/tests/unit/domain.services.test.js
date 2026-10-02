import { test } from "node:test";
import assert from "node:assert/strict";
import { AppointmentService } from "../../src/services/AppointmentService.js";
import { PaymentService } from "../../src/services/PaymentService.js";
import { ConflictError, ValidationError } from "../../src/exceptions/DomainErrors.js";
const appointments = new AppointmentService();
const payments = new PaymentService();
test("serviço de agendamento calcula duração com intervalo", () => {
    const start = new Date("2030-01-01T12:00:00.000Z");
    assert.equal(appointments.calculateEnd(start, 45, 15).getTime() - start.getTime(), 60 * 60_000);
});
test("serviço de agendamento exige horário futuro e dentro de uma janela", () => {
    assert.throws(() => appointments.assertBookableStart(new Date("2000-01-01T00:00:00Z")), ValidationError);
    appointments.assertInsideBusinessHours(9 * 60, 10 * 60, [{ start: 8 * 60, end: 12 * 60 }]);
    assert.throws(() => appointments.assertInsideBusinessHours(12 * 60, 13 * 60, [{ start: 8 * 60, end: 12 * 60 }]), ValidationError);
});
test("serviço de agendamento rejeita colisões de profissional", () => {
    const start = new Date("2030-01-01T12:00:00Z");
    const end = new Date(start.getTime() + 30 * 60_000);
    assert.throws(() => appointments.assertNoOverlap(start, end, [{ startsAt: start, endsAt: end }]), ConflictError);
    assert.doesNotThrow(() => appointments.assertNoOverlap(start, end, []));
});
test("serviço de pagamentos valida idempotência, saldo e estorno", () => {
    const existing = { appointmentId: 4, amount: 2500, method: "PIX" };
    payments.assertRequestKeyMatches(existing, existing);
    assert.throws(() => payments.assertRequestKeyMatches(existing, { ...existing, amount: 3000 }), ConflictError);
    payments.assertWithinBalance(5000, 2500, 7500);
    assert.throws(() => payments.assertWithinBalance(6000, 2000, 7500), ValidationError);
    payments.assertRefundWithinPayment(1000, 500, 2500);
    assert.throws(() => payments.assertRefundWithinPayment(2000, 600, 2500), ValidationError);
});
