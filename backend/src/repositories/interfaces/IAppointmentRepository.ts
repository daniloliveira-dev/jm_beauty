import type { AppointmentStatus, UserRole } from "@prisma/client";
import type { CreateAppointmentDTO } from "../../dtos/appointments/appointment.dto.js";

export interface AppointmentActor { userId: number; role: UserRole }
export interface IAppointmentRepository {
  list(actor: AppointmentActor, date?: string, skip?: number, take?: number): Promise<{ rows: Array<{ status: string; [key: string]: unknown }>; total: number }>;
  create(actor: AppointmentActor, input: CreateAppointmentDTO): Promise<{ id: number }>;
  availability(serviceId: number, professionalId: number, date: string): Promise<Array<{ start: string; label: string }>>;
  cancel(actor: AppointmentActor, id: number): Promise<void>;
  reschedule(actor: AppointmentActor, id: number, start: string): Promise<void>;
  updateStatus(id: number, status: AppointmentStatus): Promise<void>;
}
