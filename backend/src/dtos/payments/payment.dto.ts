import { PaymentMethod } from "@prisma/client";
import { z } from "zod";

export const paymentSchema = z.object({
  appointment_id: z.coerce.number().int().positive(),
  amount: z.number().int().positive(),
  method: z.union([
    z.enum(["dinheiro", "pix", "debito", "credito", "other"]),
    z.nativeEnum(PaymentMethod),
  ]),
  request_key: z.string().trim().min(10).max(100),
});

export const refundSchema = z.object({
  payment_id: z.coerce.number().int().positive(),
  amount: z.number().int().positive(),
  reason: z.string().trim().min(3).max(200),
  request_key: z.string().trim().min(10).max(100),
});

export const toPaymentMethod = (value: string): PaymentMethod => {
  const map: Record<string, PaymentMethod> = {
    dinheiro: PaymentMethod.CASH, pix: PaymentMethod.PIX, debito: PaymentMethod.DEBIT_CARD,
    credito: PaymentMethod.CREDIT_CARD, other: PaymentMethod.OTHER,
    CASH: PaymentMethod.CASH, PIX: PaymentMethod.PIX, DEBIT_CARD: PaymentMethod.DEBIT_CARD,
    CREDIT_CARD: PaymentMethod.CREDIT_CARD, OTHER: PaymentMethod.OTHER,
  };
  return map[value] ?? PaymentMethod.OTHER;
};

export const legacyMethod = (method: PaymentMethod): string => ({
  CASH: "dinheiro", PIX: "pix", DEBIT_CARD: "debito", CREDIT_CARD: "credito", OTHER: "other",
})[method];
