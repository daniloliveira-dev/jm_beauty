export class ListCashUseCase {
    cash;
    constructor(cash) {
        this.cash = cash;
    }
    execute() { return this.cash.list(); }
}
