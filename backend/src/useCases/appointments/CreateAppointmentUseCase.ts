import type { CreateAppointmentDTO } from "../../dtos/appointments/appointment.dto.js";
import type { AppointmentActor, IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository.js";

export class CreateAppointmentUseCase {
  constructor(private readonly appointments: IAppointmentRepository) {}
  execute(actor: AppointmentActor, input: CreateAppointmentDTO) {
    return this.appointments.create(actor, input);
  }
}
