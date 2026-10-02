import type { PaymentMethod, ScheduleBlock } from "@prisma/client";
import type { z } from "zod";
import type { blockSchema, commissionRuleSchema, pushDeviceSchema, waitlistSchema } from "../../dtos/operations/operations.dto.js";

export type BlockInput = z.infer<typeof blockSchema>;
export type CommissionRuleInput = z.infer<typeof commissionRuleSchema>;
export type WaitlistInput = z.infer<typeof waitlistSchema>;
export type PushDeviceInput = z.infer<typeof pushDeviceSchema>;

export interface IOperationsRepository {
  listBlocks(): Promise<unknown[]>;
  createBlock(input: BlockInput): Promise<ScheduleBlock>;
  deleteBlock(id: number): Promise<void>;
  listCommissionRules(): Promise<unknown[]>;
  updateCommissionRule(serviceId: number, percent: number): Promise<void>;
  listCommissions(): Promise<unknown[]>;
  payCommission(appointmentId: number, method: PaymentMethod, actorId: number): Promise<void>;
  listWaitlist(actorId: number, isAdmin: boolean): Promise<unknown[]>;
  createWaitlist(actorId: number, input: WaitlistInput): Promise<unknown>;
  listNotifications(userId: number): Promise<unknown[]>;
  registerPushDevice(userId: number, input: PushDeviceInput): Promise<void>;
  removePushDevices(userId: number): Promise<void>;
  listMonthlyReports(): Promise<unknown[]>;
  getMonthlyReport(month: string): Promise<unknown>;
  listAuditLogs(): Promise<unknown[]>;
}
