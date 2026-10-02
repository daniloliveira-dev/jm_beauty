export class ManageSalonOperationsUseCase {
    operations;
    constructor(operations) {
        this.operations = operations;
    }
    listBlocks() { return this.operations.listBlocks(); }
    createBlock(input) { return this.operations.createBlock(input); }
    deleteBlock(id) { return this.operations.deleteBlock(id); }
    listCommissionRules() { return this.operations.listCommissionRules(); }
    updateCommissionRule(id, percent) { return this.operations.updateCommissionRule(id, percent); }
    listCommissions() { return this.operations.listCommissions(); }
    payCommission(id, method, actorId) { return this.operations.payCommission(id, method, actorId); }
    listWaitlist(actorId, isAdmin) { return this.operations.listWaitlist(actorId, isAdmin); }
    createWaitlist(actorId, input) { return this.operations.createWaitlist(actorId, input); }
    listNotifications(userId) { return this.operations.listNotifications(userId); }
    registerPushDevice(userId, input) { return this.operations.registerPushDevice(userId, input); }
    removePushDevices(userId) { return this.operations.removePushDevices(userId); }
    listMonthlyReports() { return this.operations.listMonthlyReports(); }
    getMonthlyReport(month) { return this.operations.getMonthlyReport(month); }
    listAuditLogs() { return this.operations.listAuditLogs(); }
}
