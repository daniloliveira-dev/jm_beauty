import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

const positiveId = z.coerce.number().int().positive();
export const createAppointmentSchema = z.object({
  service_id: positiveId,
  professional_id: positiveId,
  start: z.iso.datetime({ offset: true }),
  notes: z.string().trim().max(500).default(""),
  user_id: positiveId.optional(),
  customer_id: positiveId.optional(),
});

export const rescheduleSchema = z.object({ start: z.iso.datetime({ offset: true }) });
export const appointmentListSchema = z.object({
  date: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});
export const availabilitySchema = z.object({
  service_id: positiveId,
  professional_id: positiveId,
  date: z.iso.date(),
});
export const appointmentStatusSchema = z.object({ status: z.nativeEnum(AppointmentStatus) });

export type CreateAppointmentDTO = z.infer<typeof createAppointmentSchema>;
