export class CreateAppointmentUseCase {
    appointments;
    constructor(appointments) {
        this.appointments = appointments;
    }
    execute(actor, input) {
        return this.appointments.create(actor, input);
    }
}
