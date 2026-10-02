import { AppointmentStatus } from "@prisma/client";
import { appointmentListSchema, appointmentStatusSchema, availabilitySchema, createAppointmentSchema, rescheduleSchema } from "../dtos/appointments/appointment.dto.js";
import { AppError } from "../exceptions/AppError.js";
import { paginationMeta } from "../utils/pagination.js";
const legacyToStatus = {
    aguardando_confirmacao: AppointmentStatus.PENDING,
    confirmado: AppointmentStatus.CONFIRMED,
    em_atendimento: AppointmentStatus.IN_PROGRESS,
    concluido: AppointmentStatus.COMPLETED,
    cancelado: AppointmentStatus.CANCELLED,
    nao_compareceu: AppointmentStatus.NO_SHOW,
};
export class AppointmentController {
    createAppointment;
    listAppointments;
    availability;
    cancelAppointment;
    rescheduleAppointment;
    updateStatusUseCase;
    constructor(createAppointment, listAppointments, availability, cancelAppointment, rescheduleAppointment, updateStatusUseCase) {
        this.createAppointment = createAppointment;
        this.listAppointments = listAppointments;
        this.availability = availability;
        this.cancelAppointment = cancelAppointment;
        this.rescheduleAppointment = rescheduleAppointment;
        this.updateStatusUseCase = updateStatusUseCase;
    }
    list = async (req, res) => {
        const query = appointmentListSchema.parse(req.query);
        const result = await this.listAppointments.execute(this.actor(req), query);
        if (req.originalUrl.startsWith("/api/")) {
            const data = result.rows.map((row) => this.toApiStatus(row));
            res.json({ data, meta: paginationMeta(query.page, query.limit, result.total) });
            return;
        }
        res.json(result.rows);
    };
    create = async (req, res) => {
        const input = createAppointmentSchema.parse(req.body);
        res.status(201).json(await this.createAppointment.execute(this.actor(req), input));
    };
    slots = async (req, res) => {
        const input = availabilitySchema.parse(req.query);
        res.json(await this.availability.execute(input));
    };
    cancel = async (req, res) => {
        await this.cancelAppointment.execute(this.actor(req), this.id(req));
        res.json({ success: true });
    };
    reschedule = async (req, res) => {
        const input = rescheduleSchema.parse(req.body);
        await this.rescheduleAppointment.execute(this.actor(req), this.id(req), input.start);
        res.json({ success: true });
    };
    updateStatus = async (req, res) => {
        const body = req.body;
        const normalized = typeof body.status === "string" ? legacyToStatus[body.status] ?? body.status : body.status;
        const input = appointmentStatusSchema.parse({ status: normalized });
        await this.updateStatusUseCase.execute(this.id(req), input.status);
        res.json({ success: true });
    };
    actor(req) {
        if (!req.auth)
            throw new AppError("Autenticação necessária.", 401);
        return { userId: req.auth.userId, role: req.auth.role };
    }
    id(req) {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1)
            throw new AppError("ID de agendamento inválido.", 400);
        return id;
    }
    toApiStatus(row) {
        const statuses = {
            aguardando_confirmacao: "PENDING", confirmado: "CONFIRMED", em_atendimento: "IN_PROGRESS",
            concluido: "COMPLETED", cancelado: "CANCELLED", nao_compareceu: "NO_SHOW",
        };
        return { ...row, status: statuses[row.status] ?? row.status };
    }
}
