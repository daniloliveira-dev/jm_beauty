import type { IReportRepository, ReportRange } from "../../repositories/interfaces/IReportRepository.js";

export class GetReportUseCase {
  constructor(private readonly reports: IReportRepository) {}
  summary(range: ReportRange) { return this.reports.summary(range); }
  byService(range: ReportRange) { return this.reports.byService(range); }
  byPaymentMethod(range: ReportRange) { return this.reports.byPaymentMethod(range); }
  appointments(range: ReportRange) { return this.reports.appointments(range); }
}
