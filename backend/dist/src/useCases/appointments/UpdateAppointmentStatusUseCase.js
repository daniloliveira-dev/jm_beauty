export class UpdateAppointmentStatusUseCase {
    appointments;
    constructor(appointments) {
        this.appointments = appointments;
    }
    execute(id, status) {
        return this.appointments.updateStatus(id, status);
    }
}
