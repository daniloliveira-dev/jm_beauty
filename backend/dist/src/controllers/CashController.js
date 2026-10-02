import { z } from "zod";
import { toPaymentMethod } from "../dtos/payments/payment.dto.js";
import { expenseSchema, openCashSchema, reconcileCashSchema } from "../dtos/cash/cash.dto.js";
import { AppError } from "../exceptions/AppError.js";
export class CashController {
    listCash;
    openCash;
    closeCash;
    reconcileCash;
    listExpenses;
    createExpense;
    constructor(listCash, openCash, closeCash, reconcileCash, listExpenses, createExpense) {
        this.listCash = listCash;
        this.openCash = openCash;
        this.closeCash = closeCash;
        this.reconcileCash = reconcileCash;
        this.listExpenses = listExpenses;
        this.createExpense = createExpense;
    }
    list = async (_req, res) => {
        res.json(await this.listCash.execute());
    };
    open = async (req, res) => {
        const input = openCashSchema.parse(req.body);
        res.status(201).json(await this.openCash.execute(input.initial, this.actorId(req)));
    };
    close = async (req, res) => {
        const date = z.iso.date().parse(req.params.date);
        await this.closeCash.execute(date);
        res.json({ success: true });
    };
    reconcile = async (req, res) => {
        const date = z.iso.date().parse(req.params.date);
        const input = reconcileCashSchema.parse(req.body);
        await this.reconcileCash.execute(date, input.counted);
        res.json({ success: true });
    };
    listExpenseRecords = async (_req, res) => {
        res.json(await this.listExpenses.execute());
    };
    createExpenseRecord = async (req, res) => {
        const input = expenseSchema.parse(req.body);
        res.status(201).json(await this.createExpense.execute({
            ...input,
            method: toPaymentMethod(input.method),
            actorId: this.actorId(req),
        }));
    };
    actorId(req) {
        if (!req.auth)
            throw new AppError("Autenticação necessária.", 401);
        return req.auth.userId;
    }
}
