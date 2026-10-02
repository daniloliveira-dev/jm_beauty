import type { PaymentMethod } from "@prisma/client";
import type { ICashRepository } from "../../repositories/interfaces/ICashRepository.js";
export class CreateExpenseUseCase {
  constructor(private readonly cash: ICashRepository) {}
  execute(input: { description: string; amount: number; method: PaymentMethod; date: string; actorId: number }) {
    return this.cash.createExpense(input);
  }
}
