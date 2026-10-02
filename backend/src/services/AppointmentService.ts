import { ConflictError, ValidationError } from "../exceptions/DomainErrors.js";

export class AppointmentService {
  calculateEnd(start: Date, durationMinutes: number, bufferMinutes = 0, quantity = 1): Date {
    return new Date(start.getTime() + (durationMinutes + bufferMinutes) * quantity * 60_000);
  }

  assertBookableStart(start: Date, now = new Date()): void {
    if (!Number.isFinite(start.getTime()) || start <= now)
      throw new ValidationError("Escolha um horário futuro.");
    const localMinute = Number(new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      minute: "2-digit",
    }).format(start));
    if (localMinute % 15 !== 0) throw new ValidationError("Os horários começam em intervalos de 15 minutos.");
  }

  assertInsideBusinessHours(startMinute: number, endMinute: number, intervals: Array<{ start: number; end: number }>): void {
    if (!intervals.some((interval) => startMinute >= interval.start && endMinute <= interval.end))
      throw new ValidationError("Fora do horário de funcionamento.");
  }

  assertNoOverlap(start: Date, end: Date, busy: Array<{ startsAt: Date; endsAt: Date }>): void {
    if (busy.some((item) => item.startsAt < end && item.endsAt > start))
      throw new ConflictError("Este horário não está mais disponível.");
  }
}
