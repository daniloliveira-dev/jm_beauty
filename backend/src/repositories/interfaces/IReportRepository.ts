export interface ReportRange { from: string; to: string }
export interface IReportRepository {
  summary(range: ReportRange): Promise<Record<string, unknown>>;
  byService(range: ReportRange): Promise<Array<Record<string, unknown>>>;
  byPaymentMethod(range: ReportRange): Promise<Array<Record<string, unknown>>>;
  appointments(range: ReportRange): Promise<Array<Record<string, unknown>>>;
}
