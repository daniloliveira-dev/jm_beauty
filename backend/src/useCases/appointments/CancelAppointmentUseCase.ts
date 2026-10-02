import type { AppointmentActor, IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository.js";

export class CancelAppointmentUseCase {
  constructor(private readonly appointments: IAppointmentRepository) {}
  async execute(actor: AppointmentActor, id: number): Promise<void> {
    await this.appointments.cancel(actor, id);
  }
}
