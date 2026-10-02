import type { Request, Response } from "express";
import { z } from "zod";
import { toPaymentMethod } from "../dtos/payments/payment.dto.js";
import { cashWithdrawalSchema, expenseSchema, openCashSchema, reconcileCashSchema } from "../dtos/cash/cash.dto.js";
import { AppError } from "../exceptions/AppError.js";
import { CloseCashUseCase } from "../useCases/cash/CloseCashUseCase.js";
import { CreateExpenseUseCase } from "../useCases/cash/CreateExpenseUseCase.js";
import { ListCashUseCase } from "../useCases/cash/ListCashUseCase.js";
import { ListExpensesUseCase } from "../useCases/cash/ListExpensesUseCase.js";
import { OpenCashUseCase } from "../useCases/cash/OpenCashUseCase.js";
import { ReconcileCashUseCase } from "../useCases/cash/ReconcileCashUseCase.js";
import { GetCashSummaryUseCase } from "../useCases/cash/GetCashSummaryUseCase.js";
import { WithdrawCashUseCase } from "../useCases/cash/WithdrawCashUseCase.js";

export class CashController {
  constructor(
    private readonly listCash: ListCashUseCase,
    private readonly openCash: OpenCashUseCase,
    private readonly closeCash: CloseCashUseCase,
    private readonly reconcileCash: ReconcileCashUseCase,
    private readonly listExpenses: ListExpensesUseCase,
    private readonly createExpense: CreateExpenseUseCase,
    private readonly getSummary: GetCashSummaryUseCase,
    private readonly withdrawCash: WithdrawCashUseCase,
  ) {}

  list = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.listCash.execute());
  };

  summary = async (req: Request, res: Response): Promise<void> => {
    const date = z.iso.date().parse(typeof req.query.date === "string" ? req.query.date : new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()));
    res.json(await this.getSummary.execute(date));
  };

  withdraw = async (req: Request, res: Response): Promise<void> => {
    const date = z.iso.date().parse(req.params.date);
    const input = cashWithdrawalSchema.parse(req.body);
    res.status(201).json(await this.withdrawCash.execute({ ...input, date, actorId: this.actorId(req) }));
  };

  open = async (req: Request, res: Response): Promise<void> => {
    const input = openCashSchema.parse(req.body);
    res.status(201).json(await this.openCash.execute(input.initial, this.actorId(req)));
  };

  close = async (req: Request, res: Response): Promise<void> => {
    const date = z.iso.date().parse(req.params.date);
    await this.closeCash.execute(date);
    res.json({ success: true });
  };

  reconcile = async (req: Request, res: Response): Promise<void> => {
    const date = z.iso.date().parse(req.params.date);
    const input = reconcileCashSchema.parse(req.body);
    await this.reconcileCash.execute(date, input.counted);
    res.json({ success: true });
  };

  listExpenseRecords = async (_req: Request, res: Response): Promise<void> => {
    res.json(await this.listExpenses.execute());
  };

  createExpenseRecord = async (req: Request, res: Response): Promise<void> => {
    const input = expenseSchema.parse(req.body);
    res.status(201).json(await this.createExpense.execute({
      ...input,
      method: toPaymentMethod(input.method),
      actorId: this.actorId(req),
    }));
  };

  private actorId(req: Request): number {
    if (!req.auth) throw new AppError("Autenticação necessária.", 401);
    return req.auth.userId;
  }
}
