import { prisma } from "../config/database.js";
const DEFAULT_DAYS = [1, 2, 3, 4, 5, 6];
export class SettingsRepository {
    async get() {
        const setting = await prisma.salonSetting.findUnique({ where: { id: 1 } });
        if (!setting)
            throw new Error("Configurações do salão ainda não foram inicializadas.");
        const businessHours = await prisma.businessHour.findMany({ where: { active: true }, orderBy: [{ dayOfWeek: "asc" }, { openingTime: "asc" }] });
        return {
            id: setting.id,
            salon_name: setting.salonName,
            phone: setting.phone,
            address: setting.address,
            opening_time: setting.openingTime,
            closing_time: setting.closingTime,
            open_hour: setting.openHour,
            close_hour: setting.closeHour,
            close_time: setting.closeTime,
            days: businessHours.length ? [...new Set(businessHours.map((hour) => hour.dayOfWeek))] : DEFAULT_DAYS,
            cancel_hours: setting.cancelHours,
            booking_advance_hours: setting.bookingAdvanceHours,
            business_hours: businessHours,
        };
    }
    async update(input) {
        const current = await prisma.salonSetting.findUnique({ where: { id: 1 } });
        const next = {
            salonName: input.salon_name ?? current?.salonName ?? "JM Beauty",
            phone: input.phone ?? current?.phone ?? "",
            address: input.address ?? current?.address ?? "",
            openingTime: input.opening_time ?? current?.openingTime ?? "09:00",
            closingTime: input.closing_time ?? current?.closingTime ?? "19:00",
            openHour: input.open_hour ?? current?.openHour ?? 9,
            closeHour: input.close_hour ?? current?.closeHour ?? 19,
            closeTime: input.close_time ?? current?.closeTime ?? "19:00",
            cancelHours: input.cancel_hours ?? current?.cancelHours ?? 24,
            bookingAdvanceHours: input.booking_advance_hours ?? current?.bookingAdvanceHours ?? 1,
        };
        await prisma.$transaction(async (tx) => {
            await tx.salonSetting.upsert({ where: { id: 1 }, update: next, create: { id: 1, ...next } });
            if (input.days) {
                await tx.businessHour.deleteMany({});
                await tx.businessHour.createMany({
                    data: input.days.map((dayOfWeek) => ({
                        dayOfWeek,
                        openingTime: next.openingTime,
                        closingTime: next.closingTime,
                        active: true,
                    })),
                });
            }
        });
        return this.get();
    }
    async listBusinessHours() {
        return prisma.businessHour.findMany({ orderBy: [{ dayOfWeek: "asc" }, { openingTime: "asc" }] });
    }
    async updateBusinessHours(input) {
        await prisma.$transaction(async (tx) => {
            await tx.businessHour.deleteMany({});
            if (input.hours.length)
                await tx.businessHour.createMany({ data: input.hours });
        });
        return this.listBusinessHours();
    }
}
