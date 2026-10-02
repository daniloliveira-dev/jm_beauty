export class ReconcileCashUseCase {
    cash;
    constructor(cash) {
        this.cash = cash;
    }
    execute(date, counted) { return this.cash.reconcile(date, counted); }
}
