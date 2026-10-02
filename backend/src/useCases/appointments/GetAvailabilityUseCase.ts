import type { IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository.js";

export class GetAvailabilityUseCase {
  constructor(private readonly appointments: IAppointmentRepository) {}
  execute(input: { service_id: number; professional_id: number; date: string }) {
    return this.appointments.availability(input.service_id, input.professional_id, input.date);
  }
}
