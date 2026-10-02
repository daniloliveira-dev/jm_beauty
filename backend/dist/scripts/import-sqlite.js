import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { AppointmentStatus, CashRegisterStatus, PaymentMethod, PaymentStatus, PrismaClient, UserRole, } from "@prisma/client";
const prisma = new PrismaClient();
const sqlitePath = resolve(process.env.SQLITE_IMPORT_PATH || process.env.DATABASE_PATH || "./data/salon.sqlite");
function string(row, key, fallback = "") {
    const value = row[key];
    return value === null || value === undefined ? fallback : String(value);
}
function number(row, key, fallback = 0) {
    const value = row[key];
    return value === null || value === undefined ? fallback : Number(value);
}
function bool(row, key, fallback = true) {
    const value = row[key];
    return value === null || value === undefined ? fallback : Number(value) !== 0;
}
function dateTime(row, key, fallback = new Date()) {
    const value = row[key];
    if (value === null || value === undefined || value === "")
        return fallback;
    const result = new Date(String(value));
    return Number.isNaN(result.getTime()) ? fallback : result;
}
function dateOnly(row, key) {
    return new Date(`${string(row, key)}T00:00:00.000Z`);
}
function method(value) {
    const map = {
        dinheiro: PaymentMethod.CASH,
        pix: PaymentMethod.PIX,
        debito: PaymentMethod.DEBIT_CARD,
        credito: PaymentMethod.CREDIT_CARD,
        cash: PaymentMethod.CASH,
        credit_card: PaymentMethod.CREDIT_CARD,
        debit_card: PaymentMethod.DEBIT_CARD,
        other: PaymentMethod.OTHER,
    };
    return map[value] ?? PaymentMethod.OTHER;
}
function appointmentStatus(value) {
    const map = {
        aguardando_confirmacao: AppointmentStatus.PENDING,
        pending: AppointmentStatus.PENDING,
        confirmado: AppointmentStatus.CONFIRMED,
        confirmed: AppointmentStatus.CONFIRMED,
        em_atendimento: AppointmentStatus.IN_PROGRESS,
        in_progress: AppointmentStatus.IN_PROGRESS,
        concluido: AppointmentStatus.COMPLETED,
        completed: AppointmentStatus.COMPLETED,
        cancelado: AppointmentStatus.CANCELLED,
        cancelled: AppointmentStatus.CANCELLED,
        nao_compareceu: AppointmentStatus.NO_SHOW,
        no_show: AppointmentStatus.NO_SHOW,
    };
    return map[value] ?? AppointmentStatus.CONFIRMED;
}
async function main() {
    if (!existsSync(sqlitePath))
        throw new Error(`Arquivo SQLite não encontrado: ${sqlitePath}`);
    if (await prisma.jobKey.findUnique({ where: { key: "sqlite-import-v1" } }))
        throw new Error("Esta origem SQLite já foi importada para este MySQL.");
    const source = new DatabaseSync(sqlitePath, { readOnly: true });
    const tables = new Set(source.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => String(row.name)));
    const rows = (table) => {
        if (!tables.has(table))
            return [];
        return source.prepare(`SELECT * FROM "${table}"`).all();
    };
    const importedUserIds = new Set();
    const importedCustomerIds = new Set();
    try {
        for (const row of rows("users")) {
            const id = number(row, "id");
            const oldRole = string(row, "role", "cliente");
            const role = oldRole === "admin" ? UserRole.ADMIN : oldRole === "operator" ? UserRole.OPERATOR : UserRole.USER;
            await prisma.user.upsert({
                where: { id },
                update: {
                    name: string(row, "name"),
                    email: string(row, "email").trim().toLowerCase(),
                    phone: string(row, "phone"),
                    passwordHash: string(row, "password"),
                    role,
                    active: true,
                },
                create: {
                    id,
                    name: string(row, "name"),
                    email: string(row, "email").trim().toLowerCase(),
                    phone: string(row, "phone"),
                    passwordHash: string(row, "password"),
                    role,
                    active: true,
                    createdAt: dateTime(row, "created_at"),
                    updatedAt: dateTime(row, "updated_at"),
                },
            });
            importedUserIds.add(id);
        }
        for (const row of rows("services")) {
            const id = number(row, "id");
            await prisma.service.upsert({
                where: { id },
                update: { name: string(row, "name"), description: string(row, "description"), price: number(row, "price"), duration: number(row, "duration", 30), buffer: number(row, "buffer"), active: bool(row, "active") },
                create: { id, name: string(row, "name"), description: string(row, "description"), price: number(row, "price"), duration: number(row, "duration", 30), buffer: number(row, "buffer"), active: bool(row, "active"), createdAt: dateTime(row, "created_at"), updatedAt: dateTime(row, "updated_at") },
            });
        }
        for (const row of rows("professionals")) {
            const id = number(row, "id");
            await prisma.professional.upsert({
                where: { id },
                update: { name: string(row, "name"), active: bool(row, "active"), phone: string(row, "phone"), specialty: string(row, "specialty") },
                create: { id, name: string(row, "name"), active: bool(row, "active"), phone: string(row, "phone"), specialty: string(row, "specialty"), createdAt: dateTime(row, "created_at"), updatedAt: dateTime(row, "updated_at") },
            });
        }
        for (const row of rows("skills")) {
            const professionalId = number(row, "professional_id");
            const serviceId = number(row, "service_id");
            await prisma.professionalSkill.upsert({
                where: { professionalId_serviceId: { professionalId, serviceId } },
                update: {},
                create: { professionalId, serviceId },
            });
        }
        for (const row of rows("users")) {
            if (string(row, "role", "cliente") === "admin")
                continue;
            const id = number(row, "id");
            importedCustomerIds.add(id);
            await prisma.customer.upsert({
                where: { userId: id },
                update: { name: string(row, "name"), email: string(row, "email").toLowerCase(), phone: string(row, "phone"), active: true },
                create: { id, userId: id, name: string(row, "name"), email: string(row, "email").toLowerCase(), phone: string(row, "phone"), active: true },
            });
        }
        const oldSettings = rows("settings")[0];
        if (oldSettings) {
            const daysValue = string(oldSettings, "days", "[1,2,3,4,5,6]");
            const days = JSON.parse(daysValue);
            const openHour = number(oldSettings, "open_hour", 9);
            const closeHour = number(oldSettings, "close_hour", 19);
            await prisma.salonSetting.upsert({
                where: { id: 1 },
                update: { openHour, closeHour, closeTime: string(oldSettings, "close_time", "19:00"), cancelHours: number(oldSettings, "cancel_hours", 24), days },
                create: { id: 1, openHour, closeHour, closeTime: string(oldSettings, "close_time", "19:00"), cancelHours: number(oldSettings, "cancel_hours", 24), days },
            });
            await prisma.businessHour.createMany({
                data: days.map((dayOfWeek) => ({ dayOfWeek, openingTime: `${String(openHour).padStart(2, "0")}:00`, closingTime: `${String(closeHour).padStart(2, "0")}:00`, active: true })),
                skipDuplicates: true,
            });
        }
        for (const row of rows("blocks")) {
            const id = number(row, "id");
            await prisma.scheduleBlock.upsert({
                where: { id },
                update: {},
                create: { id, professionalId: row.professional_id === null ? null : number(row, "professional_id"), startsAt: dateTime(row, "start"), endsAt: dateTime(row, "end"), reason: string(row, "reason") },
            });
        }
        for (const row of rows("appointments")) {
            const id = number(row, "id");
            const userId = number(row, "user_id");
            const customerId = importedCustomerIds.has(userId) ? userId : null;
            await prisma.appointment.upsert({
                where: { id },
                update: {},
                create: {
                    id,
                    userId,
                    customerId,
                    professionalId: number(row, "professional_id"),
                    serviceId: number(row, "service_id"),
                    startsAt: dateTime(row, "start"),
                    endsAt: dateTime(row, "end"),
                    status: appointmentStatus(string(row, "status", "confirmado")),
                    price: number(row, "price"),
                    serviceName: string(row, "service_name"),
                    notes: string(row, "notes"),
                    createdAt: dateTime(row, "created_at"),
                    updatedAt: dateTime(row, "updated_at"),
                },
            });
        }
        for (const row of rows("products")) {
            const id = number(row, "id");
            await prisma.product.upsert({
                where: { id },
                update: {},
                create: { id, name: string(row, "name"), price: number(row, "price"), stock: number(row, "stock"), minimum: number(row, "minimum", 3), active: bool(row, "active"), createdAt: dateTime(row, "created_at"), updatedAt: dateTime(row, "updated_at") },
            });
        }
        for (const row of rows("appointment_items")) {
            const id = number(row, "id");
            await prisma.appointmentItem.upsert({
                where: { id },
                update: {},
                create: { id, appointmentId: number(row, "appointment_id"), kind: string(row, "kind"), name: string(row, "name"), quantity: number(row, "quantity", 1), unitPrice: number(row, "unit_price"), productId: row.product_id === null ? null : number(row, "product_id"), commission: number(row, "commission") },
            });
        }
        for (const row of rows("order_adjustments")) {
            const appointmentId = number(row, "appointment_id");
            await prisma.orderAdjustment.upsert({
                where: { appointmentId },
                update: {},
                create: { appointmentId, discount: number(row, "discount"), extra: number(row, "extra"), reason: string(row, "reason") },
            });
        }
        for (const row of rows("commission_rules")) {
            const serviceId = number(row, "service_id");
            await prisma.commissionRule.upsert({ where: { serviceId }, update: {}, create: { serviceId, percent: number(row, "percent") } });
        }
        for (const row of rows("payments")) {
            const id = number(row, "id");
            await prisma.payment.upsert({
                where: { id },
                update: {},
                create: { id, appointmentId: number(row, "appointment_id"), amount: number(row, "amount"), method: method(string(row, "method")), status: PaymentStatus.PAID, paidAt: dateTime(row, "created_at"), requestKey: string(row, "request_key", `sqlite-payment-${id}`), createdAt: dateTime(row, "created_at"), updatedAt: dateTime(row, "created_at") },
            });
        }
        for (const row of rows("refunds")) {
            const id = number(row, "id");
            await prisma.refund.upsert({
                where: { id },
                update: {},
                create: { id, paymentId: number(row, "payment_id"), amount: number(row, "amount"), reason: string(row, "reason"), requestKey: string(row, "request_key", `sqlite-refund-${id}`), createdAt: dateTime(row, "created_at") },
            });
        }
        for (const row of rows("expenses")) {
            const id = number(row, "id");
            await prisma.expense.upsert({
                where: { id },
                update: {},
                create: { id, description: string(row, "description"), amount: number(row, "amount"), method: method(string(row, "method")), date: dateOnly(row, "date"), createdAt: dateTime(row, "date") },
            });
        }
        for (const row of rows("cash_days")) {
            const legacyStatus = string(row, "status", "aberto");
            const status = legacyStatus === "conferido" ? CashRegisterStatus.CLOSED : legacyStatus === "aguardando_conferencia" ? CashRegisterStatus.REVIEW : CashRegisterStatus.OPEN;
            await prisma.cashRegister.upsert({
                where: { businessDate: dateOnly(row, "date") },
                update: {},
                create: { businessDate: dateOnly(row, "date"), openingBalance: number(row, "initial"), expectedBalance: row.expected === null ? null : number(row, "expected"), countedBalance: row.counted === null ? null : number(row, "counted"), closingBalance: row.counted === null ? null : number(row, "counted"), status, closedAt: row.closed_at ? dateTime(row, "closed_at") : null },
            });
        }
        for (const row of rows("commissions")) {
            const appointmentId = number(row, "appointment_id");
            await prisma.commission.upsert({
                where: { appointmentId },
                update: {},
                create: { appointmentId, professionalId: number(row, "professional_id"), amount: number(row, "amount"), paidAt: row.paid_at ? dateTime(row, "paid_at") : null, expenseId: row.expense_id === null ? null : number(row, "expense_id") },
            });
        }
        for (const row of rows("notifications")) {
            const id = number(row, "id");
            await prisma.notification.upsert({ where: { id }, update: {}, create: { id, userId: number(row, "user_id"), title: string(row, "title"), createdAt: dateTime(row, "created_at") } });
        }
        for (const row of rows("push_devices")) {
            const token = string(row, "token");
            await prisma.pushDevice.upsert({ where: { token }, update: {}, create: { token, userId: number(row, "user_id"), enabled: bool(row, "enabled") } });
        }
        for (const row of rows("waitlist")) {
            const id = number(row, "id");
            await prisma.waitlistEntry.upsert({
                where: { id }, update: {},
                create: { id, userId: number(row, "user_id"), serviceId: number(row, "service_id"), professionalId: number(row, "professional_id"), date: dateOnly(row, "date"), status: string(row, "status", "aguardando") === "aguardando" ? "waiting" : string(row, "status") },
            });
        }
        for (const row of rows("audit")) {
            const id = number(row, "id");
            await prisma.auditLog.upsert({
                where: { id }, update: {},
                create: { id, userId: row.user_id === null ? null : number(row, "user_id"), action: string(row, "action"), entityId: row.entity_id === null ? null : number(row, "entity_id"), createdAt: dateTime(row, "created_at") },
            });
        }
        for (const row of rows("monthly_reports")) {
            const month = string(row, "month");
            let data;
            try {
                data = JSON.parse(string(row, "data"));
            }
            catch {
                data = {};
            }
            await prisma.monthlyReport.upsert({ where: { month }, update: {}, create: { month, data, createdAt: dateTime(row, "created_at") } });
        }
        await prisma.jobKey.create({ data: { key: "sqlite-import-v1" } });
        console.log(`Importação SQLite concluída. Usuários importados: ${importedUserIds.size}. Origem preservada em ${sqlitePath}.`);
    }
    finally {
        source.close();
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error("Falha ao importar SQLite:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
