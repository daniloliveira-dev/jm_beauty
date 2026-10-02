import type { AppointmentActor, IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository.js";

export class ListAppointmentsUseCase {
  constructor(private readonly appointments: IAppointmentRepository) {}
  execute(actor: AppointmentActor, input: { date?: string; page: number; limit: number }) {
    return this.appointments.list(actor, input.date, (input.page - 1) * input.limit, input.limit);
  }
}
