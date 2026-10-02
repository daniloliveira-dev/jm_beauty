import type { ICashRepository } from "../../repositories/interfaces/ICashRepository.js";
export class ListCashUseCase {
  constructor(private readonly cash: ICashRepository) {}
  execute() { return this.cash.list(); }
}
