import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).default(""),
  email: z.union([z.email(), z.literal("")]).default(""),
  notes: z.string().trim().max(2000).default(""),
  active: z.union([z.boolean(), z.literal(0), z.literal(1)]).transform(Boolean).default(true),
});

export const customerListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(100),
  search: z.string().trim().max(100).optional(),
});
export type CustomerInput = z.infer<typeof customerSchema>;
