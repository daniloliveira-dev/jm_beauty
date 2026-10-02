import type { ICashRepository } from "../../repositories/interfaces/ICashRepository.js";

export class GetCashSummaryUseCase {
  constructor(private readonly cash: ICashRepository) {}
  execute(date: string) {
    return this.cash.summary(date);
  }
}
