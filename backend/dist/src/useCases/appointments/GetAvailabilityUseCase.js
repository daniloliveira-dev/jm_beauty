export class GetAvailabilityUseCase {
    appointments;
    constructor(appointments) {
        this.appointments = appointments;
    }
    execute(input) {
        return this.appointments.availability(input.service_id, input.professional_id, input.date);
    }
}
