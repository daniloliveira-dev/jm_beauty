export class CloseCashUseCase {
    cash;
    constructor(cash) {
        this.cash = cash;
    }
    execute(date) { return this.cash.close(date); }
}
