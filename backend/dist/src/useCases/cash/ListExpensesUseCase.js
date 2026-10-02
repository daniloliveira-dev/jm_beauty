export class ListExpensesUseCase {
    cash;
    constructor(cash) {
        this.cash = cash;
    }
    execute() { return this.cash.listExpenses(); }
}
