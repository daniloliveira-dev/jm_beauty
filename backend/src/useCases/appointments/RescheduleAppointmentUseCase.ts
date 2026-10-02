import type { AppointmentActor, IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository.js";

export class RescheduleAppointmentUseCase {
  constructor(private readonly appointments: IAppointmentRepository) {}
  async execute(actor: AppointmentActor, id: number, start: string): Promise<void> {
    await this.appointments.reschedule(actor, id, start);
  }
}
