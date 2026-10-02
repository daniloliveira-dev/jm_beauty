import { UserRole } from "@prisma/client";
import { z } from "zod";
import { blockSchema, commissionRuleSchema, pushDeviceSchema, waitlistSchema } from "../dtos/operations/operations.dto.js";
import { toPaymentMethod } from "../dtos/payments/payment.dto.js";
import { AppError } from "../exceptions/AppError.js";
const idSchema = z.coerce.number().int().positive();
const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export class OperationsController {
    operations;
    constructor(operations) {
        this.operations = operations;
    }
    listBlocks = async (_req, res) => { res.json(await this.operations.listBlocks()); };
    createBlock = async (req, res) => {
        const block = await this.operations.createBlock(blockSchema.parse(req.body));
        res.status(201).json({ id: block.id, professional_id: block.professionalId, start: block.startsAt.toISOString(), end: block.endsAt.toISOString(), reason: block.reason });
    };
    deleteBlock = async (req, res) => {
        await this.operations.deleteBlock(idSchema.parse(req.params.id));
        res.status(204).end();
    };
    listCommissionRules = async (_req, res) => { res.json(await this.operations.listCommissionRules()); };
    updateCommissionRule = async (req, res) => {
        const id = idSchema.parse(req.params.id);
        const input = commissionRuleSchema.parse(req.body);
        await this.operations.updateCommissionRule(id, input.percent);
        res.json({ success: true });
    };
    listCommissions = async (_req, res) => { res.json(await this.operations.listCommissions()); };
    payCommission = async (req, res) => {
        const input = z.object({ method: z.string() }).parse(req.body);
        await this.operations.payCommission(idSchema.parse(req.params.id), toPaymentMethod(input.method), this.actorId(req));
        res.json({ success: true });
    };
    listWaitlist = async (req, res) => {
        const isAdmin = req.auth?.role !== UserRole.USER;
        res.json(await this.operations.listWaitlist(this.actorId(req), isAdmin));
    };
    createWaitlist = async (req, res) => {
        res.status(201).json(await this.operations.createWaitlist(this.actorId(req), waitlistSchema.parse(req.body)));
    };
    listNotifications = async (req, res) => { res.json(await this.operations.listNotifications(this.actorId(req))); };
    registerPushDevice = async (req, res) => {
        await this.operations.registerPushDevice(this.actorId(req), pushDeviceSchema.parse(req.body));
        res.json({ success: true });
    };
    removePushDevices = async (req, res) => {
        await this.operations.removePushDevices(this.actorId(req));
        res.status(204).end();
    };
    listMonthlyReports = async (_req, res) => { res.json(await this.operations.listMonthlyReports()); };
    getMonthlyReport = async (req, res) => { res.json(await this.operations.getMonthlyReport(monthSchema.parse(req.params.month))); };
    listAuditLogs = async (_req, res) => { res.json(await this.operations.listAuditLogs()); };
    actorId(req) {
        if (!req.auth)
            throw new AppError("Autenticação necessária.", 401);
        return req.auth.userId;
    }
}
