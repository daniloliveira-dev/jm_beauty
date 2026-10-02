export class CancelAppointmentUseCase {
    appointments;
    constructor(appointments) {
        this.appointments = appointments;
    }
    async execute(actor, id) {
        await this.appointments.cancel(actor, id);
    }
}
