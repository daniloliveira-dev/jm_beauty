import { UserRole } from "@prisma/client";
import type { Request, Response } from "express";
import { z } from "zod";
import { blockSchema, commissionRuleSchema, pushDeviceSchema, waitlistSchema } from "../dtos/operations/operations.dto.js";
import { toPaymentMethod } from "../dtos/payments/payment.dto.js";
import { AppError } from "../exceptions/AppError.js";
import { ManageSalonOperationsUseCase } from "../useCases/operations/ManageSalonOperationsUseCase.js";

const idSchema = z.coerce.number().int().positive();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

export class OperationsController {
  constructor(private readonly operations: ManageSalonOperationsUseCase) {}

  listBlocks = async (_req: Request, res: Response): Promise<void> => { res.json(await this.operations.listBlocks()); };
  createBlock = async (req: Request, res: Response): Promise<void> => {
    const block = await this.operations.createBlock(blockSchema.parse(req.body));
    res.status(201).json({ id: block.id, professional_id: block.professionalId, start: block.startsAt.toISOString(), end: block.endsAt.toISOString(), reason: block.reason });
  };
  deleteBlock = async (req: Request, res: Response): Promise<void> => {
    await this.operations.deleteBlock(idSchema.parse(req.params.id));
    res.status(204).end();
  };
  listCommissionRules = async (_req: Request, res: Response): Promise<void> => { res.json(await this.operations.listCommissionRules()); };
  updateCommissionRule = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const input = commissionRuleSchema.parse(req.body);
    await this.operations.updateCommissionRule(id, input.percent);
    res.json({ success: true });
  };
  listCommissions = async (_req: Request, res: Response): Promise<void> => { res.json(await this.operations.listCommissions()); };
  payCommission = async (req: Request, res: Response): Promise<void> => {
    const input = z.object({ method: z.string() }).parse(req.body);
    await this.operations.payCommission(idSchema.parse(req.params.id), toPaymentMethod(input.method), this.actorId(req));
    res.json({ success: true });
  };
  listWaitlist = async (req: Request, res: Response): Promise<void> => {
    const isAdmin = req.auth?.role !== UserRole.USER;
    res.json(await this.operations.listWaitlist(this.actorId(req), isAdmin));
  };
  createWaitlist = async (req: Request, res: Response): Promise<void> => {
    res.status(201).json(await this.operations.createWaitlist(this.actorId(req), waitlistSchema.parse(req.body)));
  };
  listNotifications = async (req: Request, res: Response): Promise<void> => { res.json(await this.operations.listNotifications(this.actorId(req))); };
  registerPushDevice = async (req: Request, res: Response): Promise<void> => {
    await this.operations.registerPushDevice(this.actorId(req), pushDeviceSchema.parse(req.body));
    res.json({ success: true });
  };
  removePushDevices = async (req: Request, res: Response): Promise<void> => {
    await this.operations.removePushDevices(this.actorId(req));
    res.status(204).end();
  };
  listMonthlyReports = async (_req: Request, res: Response): Promise<void> => { res.json(await this.operations.listMonthlyReports()); };
  getMonthlyReport = async (req: Request, res: Response): Promise<void> => { res.json(await this.operations.getMonthlyReport(monthSchema.parse(req.params.month))); };
  listAuditLogs = async (_req: Request, res: Response): Promise<void> => { res.json(await this.operations.listAuditLogs()); };

  private actorId(req: Request): number {
    if (!req.auth) throw new AppError("Autenticação necessária.", 401);
    return req.auth.userId;
  }
}
