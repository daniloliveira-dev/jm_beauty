export class GetReportUseCase {
    reports;
    constructor(reports) {
        this.reports = reports;
    }
    summary(range) { return this.reports.summary(range); }
    byService(range) { return this.reports.byService(range); }
    byPaymentMethod(range) { return this.reports.byPaymentMethod(range); }
    appointments(range) { return this.reports.appointments(range); }
}
