export class RescheduleAppointmentUseCase {
    appointments;
    constructor(appointments) {
        this.appointments = appointments;
    }
    async execute(actor, id, start) {
        await this.appointments.reschedule(actor, id, start);
    }
}
