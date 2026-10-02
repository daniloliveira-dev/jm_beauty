import { z } from "zod";

const activeValue = z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean);

export const serviceInputSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(500).default(""),
  price: z.number().int().min(0),
  duration: z.number().int().min(1).max(600),
  buffer: z.number().int().min(0).max(120).default(0),
  active: activeValue.default(true),
});

export const serviceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  search: z.string().trim().max(100).optional(),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;
