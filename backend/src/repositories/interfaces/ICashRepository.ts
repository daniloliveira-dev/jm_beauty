import type { PaymentMethod } from "@prisma/client";

export interface ICashRepository {
  list(): Promise<Array<Record<string, unknown>>>;
  summary(date: string): Promise<Record<string, unknown>>;
  open(initial: number, actorId: number): Promise<Record<string, unknown>>;
  withdraw(input: { date: string; amount: number; description: string; actorId: number }): Promise<Record<string, unknown>>;
  close(date: string): Promise<void>;
  reconcile(date: string, counted: number): Promise<void>;
  listExpenses(): Promise<Array<Record<string, unknown>>>;
  createExpense(input: { description: string; amount: number; method: PaymentMethod; date: string; actorId: number }): Promise<Record<string, unknown>>;
}
