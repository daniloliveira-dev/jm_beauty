import type { AppointmentStatus } from "@prisma/client";
import type { IAppointmentRepository } from "../../repositories/interfaces/IAppointmentRepository.js";

export class UpdateAppointmentStatusUseCase {
  constructor(private readonly appointments: IAppointmentRepository) {}
  execute(id: number, status: AppointmentStatus): Promise<void> {
    return this.appointments.updateStatus(id, status);
  }
}
