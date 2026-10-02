export class ListAppointmentsUseCase {
    appointments;
    constructor(appointments) {
        this.appointments = appointments;
    }
    execute(actor, input) {
        return this.appointments.list(actor, input.date, (input.page - 1) * input.limit, input.limit);
    }
}
