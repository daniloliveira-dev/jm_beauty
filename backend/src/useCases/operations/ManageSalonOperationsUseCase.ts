import type { PaymentMethod } from "@prisma/client";
import type { BlockInput, IOperationsRepository, PushDeviceInput, WaitlistInput } from "../../repositories/interfaces/IOperationsRepository.js";

export class ManageSalonOperationsUseCase {
  constructor(private readonly operations: IOperationsRepository) {}
  listBlocks() { return this.operations.listBlocks(); }
  createBlock(input: BlockInput) { return this.operations.createBlock(input); }
  deleteBlock(id: number) { return this.operations.deleteBlock(id); }
  listCommissionRules() { return this.operations.listCommissionRules(); }
  updateCommissionRule(id: number, percent: number) { return this.operations.updateCommissionRule(id, percent); }
  listCommissions() { return this.operations.listCommissions(); }
  payCommission(id: number, method: PaymentMethod, actorId: number) { return this.operations.payCommission(id, method, actorId); }
  listWaitlist(actorId: number, isAdmin: boolean) { return this.operations.listWaitlist(actorId, isAdmin); }
  createWaitlist(actorId: number, input: WaitlistInput) { return this.operations.createWaitlist(actorId, input); }
  listNotifications(userId: number) { return this.operations.listNotifications(userId); }
  registerPushDevice(userId: number, input: PushDeviceInput) { return this.operations.registerPushDevice(userId, input); }
  removePushDevices(userId: number) { return this.operations.removePushDevices(userId); }
  listMonthlyReports() { return this.operations.listMonthlyReports(); }
  getMonthlyReport(month: string) { return this.operations.getMonthlyReport(month); }
  listAuditLogs() { return this.operations.listAuditLogs(); }
}
