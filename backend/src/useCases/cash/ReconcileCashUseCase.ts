import type { ICashRepository } from "../../repositories/interfaces/ICashRepository.js";
export class ReconcileCashUseCase {
  constructor(private readonly cash: ICashRepository) {}
  execute(date: string, counted: number) { return this.cash.reconcile(date, counted); }
}
