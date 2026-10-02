import PDFDocument from "pdfkit";
import type { Request, Response } from "express";
import { reportRangeSchema } from "../dtos/reports/report.dto.js";
import { ValidationError } from "../exceptions/DomainErrors.js";
import { GetReportUseCase } from "../useCases/reports/GetReportUseCase.js";

export class ReportController {
  constructor(private readonly reports: GetReportUseCase) {}

  summary = async (req: Request, res: Response): Promise<void> => {
    const range = reportRangeSchema.parse(req.query);
    const data = await this.reports.summary(range);
    if (req.query.format === "csv") {
      const rows = [
        ["Indicador", "Valor (centavos)"],
        ["Atendimentos concluídos", String(data.attendances)],
        ["Faturamento", String(data.revenue)],
        ["Recebido", String(data.received)],
        ["Despesas", String(data.expenses)],
        ["Resultado", String(data.result)],
        ["Pendente", String(data.outstanding)],
      ];
      res.type("text/csv").attachment("relatorio.csv").send("\uFEFF" + rows.map((row) => row.join(";")).join("\r\n"));
      return;
    }
    if (req.query.format === "pdf") {
      res.type("application/pdf").attachment("relatorio.pdf");
      const pdf = new PDFDocument({ margin: 48 });
      pdf.pipe(res);
      pdf.fontSize(22).text("JM Beauty");
      pdf.fontSize(12).text(`Relatório: ${range.from} a ${range.to}`).moveDown();
      for (const [label, value] of [
        ["Atendimentos concluídos", data.attendances],
        ["Faturamento (centavos)", data.revenue],
        ["Recebido (centavos)", data.received],
        ["Despesas (centavos)", data.expenses],
        ["Resultado (centavos)", data.result],
        ["Pendente (centavos)", data.outstanding],
      ]) pdf.text(`${label}: ${value}`);
      pdf.end();
      return;
    }
    res.json(data);
  };

  daily = async (req: Request, res: Response): Promise<void> => {
    const date = typeof req.query.date === "string" ? req.query.date : new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
    const range = reportRangeSchema.parse({ from: date, to: date });
    res.json(await this.reports.summary(range));
  };

  monthly = async (req: Request, res: Response): Promise<void> => {
    const raw = typeof req.query.month === "string" ? req.query.month : new Date().toISOString().slice(0, 7);
    const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(raw);
    if (!match) throw new ValidationError("Informe o mês no formato YYYY-MM.");
    const year = Number(match[1]);
    const month = Number(match[2]);
    const from = `${match[1]}-${match[2]}-01`;
    const to = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
    res.json(await this.reports.summary({ from, to }));
  };

  services = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.reports.byService(reportRangeSchema.parse(req.query)));
  };

  payments = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.reports.byPaymentMethod(reportRangeSchema.parse(req.query)));
  };

  appointments = async (req: Request, res: Response): Promise<void> => {
    res.json(await this.reports.appointments(reportRangeSchema.parse(req.query)));
  };
}
