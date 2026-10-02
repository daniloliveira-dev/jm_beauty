import type { ICashRepository } from "../../repositories/interfaces/ICashRepository.js";
export class CloseCashUseCase {
  constructor(private readonly cash: ICashRepository) {}
  execute(date: string) { return this.cash.close(date); }
}
