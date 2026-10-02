import { z } from "zod";

export const reportRangeSchema = z.object({
  from: z.iso.date(),
  to: z.iso.date(),
}).refine(({ from, to }) => from <= to, "A data inicial deve ser anterior à final.");

export const reportDateSchema = z.object({ date: z.iso.date().optional() });
