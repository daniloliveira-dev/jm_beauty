import { AppointmentStatus } from "@prisma/client";
import type { Request, Response } from "express";
import { appointmentListSchema, appointmentStatusSchema, availabilitySchema, createAppointmentSchema, rescheduleSchema } from "../dtos/appointments/appointment.dto.js";
import { AppError } from "../exceptions/AppError.js";
import type { AppointmentActor } from "../repositories/interfaces/IAppointmentRepository.js";
import { CancelAppointmentUseCase } from "../useCases/appointments/CancelAppointmentUseCase.js";
import { CreateAppointmentUseCase } from "../useCases/appointments/CreateAppointmentUseCase.js";
import { GetAvailabilityUseCase } from "../useCases/appointments/GetAvailabilityUseCase.js";
import { ListAppointmentsUseCase } from "../useCases/appointments/ListAppointmentsUseCase.js";
import { RescheduleAppointmentUseCase } from "../useCases/appointments/RescheduleAppointmentUseCase.js";
import { UpdateAppointmentStatusUseCase } from "../useCases/appointments/UpdateAppointmentStatusUseCase.js";
import { paginationMeta } from "../utils/pagination.js";

const legacyToStatus: Record<string, AppointmentStatus> = {
  aguardando_confirmacao: AppointmentStatus.PENDING,
  confirmado: AppointmentStatus.CONFIRMED,
  em_atendimento: AppointmentStatus.IN_PROGRESS,
  concluido: AppointmentStatus.COMPLETED,
  cancelado: AppointmentStatus.CANCELLED,
  nao_compareceu: AppointmentStatus.NO_SHOW,
};

export class AppointmentController {
  constructor(
    private readonly createAppointment: CreateAppointmentUseCase,
    private readonly listAppointments: ListAppointmentsUseCase,
    private readonly availability: GetAvailabilityUseCase,
    private readonly cancelAppointment: CancelAppointmentUseCase,
    private readonly rescheduleAppointment: RescheduleAppointmentUseCase,
    private readonly updateStatusUseCase: UpdateAppointmentStatusUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = appointmentListSchema.parse(req.query);
    const result = await this.listAppointments.execute(this.actor(req), query);
    if (req.originalUrl.startsWith("/api/")) {
      const data = result.rows.map((row) => this.toApiStatus(row));
      res.json({ data, meta: paginationMeta(query.page, query.limit, result.total) });
      return;
    }
    res.json(result.rows);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createAppointmentSchema.parse(req.body);
    res.status(201).json(await this.createAppointment.execute(this.actor(req), input));
  };

  slots = async (req: Request, res: Response): Promise<void> => {
    const input = availabilitySchema.parse(req.query);
    res.json(await this.availability.execute(input));
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    await this.cancelAppointment.execute(this.actor(req), this.id(req));
    res.json({ success: true });
  };

  reschedule = async (req: Request, res: Response): Promise<void> => {
    const input = rescheduleSchema.parse(req.body);
    await this.rescheduleAppointment.execute(this.actor(req), this.id(req), input.start);
    res.json({ success: true });
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as { status?: unknown };
    const normalized = typeof body.status === "string" ? legacyToStatus[body.status] ?? body.status : body.status;
    const input = appointmentStatusSchema.parse({ status: normalized });
    await this.updateStatusUseCase.execute(this.id(req), input.status);
    res.json({ success: true });
  };

  private actor(req: Request): AppointmentActor {
    if (!req.auth) throw new AppError("Autenticação necessária.", 401);
    return { userId: req.auth.userId, role: req.auth.role };
  }

  private id(req: Request): number {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new AppError("ID de agendamento inválido.", 400);
    return id;
  }

  private toApiStatus<T extends { status: string }>(row: T): T {
    const statuses: Record<string, string> = {
      aguardando_confirmacao: "PENDING", confirmado: "CONFIRMED", em_atendimento: "IN_PROGRESS",
      concluido: "COMPLETED", cancelado: "CANCELLED", nao_compareceu: "NO_SHOW",
    };
    return { ...row, status: statuses[row.status] ?? row.status };
  }
}
