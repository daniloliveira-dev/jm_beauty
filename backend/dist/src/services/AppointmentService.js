import { ConflictError, ValidationError } from "../exceptions/DomainErrors.js";
export class AppointmentService {
    calculateEnd(start, durationMinutes, bufferMinutes = 0, quantity = 1) {
        return new Date(start.getTime() + (durationMinutes + bufferMinutes) * quantity * 60_000);
    }
    assertBookableStart(start, now = new Date()) {
        if (!Number.isFinite(start.getTime()) || start <= now)
            throw new ValidationError("Escolha um horário futuro.");
        const localMinute = Number(new Intl.DateTimeFormat("en-GB", {
            timeZone: "America/Sao_Paulo",
            minute: "2-digit",
        }).format(start));
        if (localMinute % 15 !== 0)
            throw new ValidationError("Os horários começam em intervalos de 15 minutos.");
    }
    assertInsideBusinessHours(startMinute, endMinute, intervals) {
        if (!intervals.some((interval) => startMinute >= interval.start && endMinute <= interval.end))
            throw new ValidationError("Fora do horário de funcionamento.");
    }
    assertNoOverlap(start, end, busy) {
        if (busy.some((item) => item.startsAt < end && item.endsAt > start))
            throw new ConflictError("Este horário não está mais disponível.");
    }
}
