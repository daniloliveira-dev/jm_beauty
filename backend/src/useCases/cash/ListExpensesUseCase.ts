import type { ICashRepository } from "../../repositories/interfaces/ICashRepository.js";
export class ListExpensesUseCase {
  constructor(private readonly cash: ICashRepository) {}
  execute() { return this.cash.listExpenses(); }
}
