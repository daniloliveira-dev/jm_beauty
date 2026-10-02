import { z } from "zod";

const activeValue = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean);
export const professionalSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  specialty: z.string().trim().max(150).default(""),
  active: activeValue.default(true),
  service_ids: z.array(z.number().int().positive()).default([]),
});
export type ProfessionalInput = z.infer<typeof professionalSchema>;
