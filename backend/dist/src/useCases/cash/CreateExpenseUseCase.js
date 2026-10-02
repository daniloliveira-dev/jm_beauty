export class CreateExpenseUseCase {
    cash;
    constructor(cash) {
        this.cash = cash;
    }
    execute(input) {
        return this.cash.createExpense(input);
    }
}
