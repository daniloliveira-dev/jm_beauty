import type { ICashRepository } from "../../repositories/interfaces/ICashRepository.js";

export class WithdrawCashUseCase {
  constructor(private readonly cash: ICashRepository) {}
  execute(input: { date: string; amount: number; description: string; actorId: number }) {
    return this.cash.withdraw(input);
  }
}
