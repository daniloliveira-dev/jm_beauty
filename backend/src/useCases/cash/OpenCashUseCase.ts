import type { ICashRepository } from "../../repositories/interfaces/ICashRepository.js";
export class OpenCashUseCase {
  constructor(private readonly cash: ICashRepository) {}
  execute(initial: number, actorId: number) { return this.cash.open(initial, actorId); }
}
