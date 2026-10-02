import { z } from "zod";
export const blockSchema = z.object({
    professional_id: z.number().int().positive().nullable(),
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }),
    reason: z.string().trim().max(200).default(""),
}).refine(({ start, end }) => new Date(end) > new Date(start), "O fim deve ser posterior ao início.");
export const commissionRuleSchema = z.object({ percent: z.number().int().min(0).max(100) });
export const waitlistSchema = z.object({
    service_id: z.number().int().positive(),
    professional_id: z.number().int().positive(),
    date: z.iso.date(),
});
export const pushDeviceSchema = z.object({
    token: z.string().regex(/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/),
    enabled: z.boolean().default(true),
});
