import { z } from "zod";

export const settingsUpdateSchema = z.object({
  salon_name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(255).optional(),
  opening_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  closing_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  open_hour: z.number().int().min(0).max(23).optional(),
  close_hour: z.number().int().min(1).max(24).optional(),
  close_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  days: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  cancel_hours: z.number().int().min(0).max(168).optional(),
  booking_advance_hours: z.number().int().min(0).max(8760).optional(),
}).refine((value) => value.open_hour === undefined || value.close_hour === undefined || value.close_hour > value.open_hour, "Fechamento deve ocorrer após a abertura.");

export const businessHoursSchema = z.object({
  hours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    closingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    active: z.boolean().default(true),
  }).refine(({ openingTime, closingTime }) => openingTime < closingTime, "Intervalo de horário inválido.")).max(28),
});
