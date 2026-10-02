export class OpenCashUseCase {
    cash;
    constructor(cash) {
        this.cash = cash;
    }
    execute(initial, actorId) { return this.cash.open(initial, actorId); }
}
