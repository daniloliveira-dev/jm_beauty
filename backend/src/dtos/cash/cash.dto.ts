import { z } from "zod";

export const openCashSchema = z.object({ initial: z.number().int().min(0) });
export const reconcileCashSchema = z.object({ counted: z.number().int().min(0) });
export const cashWithdrawalSchema = z.object({
  amount: z.number().int().positive(),
  description: z.string().trim().min(2).max(200).default("Sangria"),
});
export const expenseSchema = z.object({
  description: z.string().trim().min(2).max(200),
  amount: z.number().int().positive(),
  method: z.enum(["dinheiro", "pix", "debito", "credito", "other", "CASH", "PIX", "DEBIT_CARD", "CREDIT_CARD", "OTHER"]),
  date: z.iso.date(),
});
