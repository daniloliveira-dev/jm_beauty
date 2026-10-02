import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
const headers = () => ({
    "Content-Type": "application/json",
    ...(env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${env.EXPO_ACCESS_TOKEN}` } : {}),
});
export class PushNotificationService {
    async deliver() {
        if (!env.PUSH_ENABLED)
            return;
        const now = new Date();
        const rows = await prisma.pushQueue.findMany({
            where: {
                status: "pending",
                attempts: { lt: 5 },
                OR: [{ nextAttempt: null }, { nextAttempt: { lte: now } }],
                device: { enabled: true },
            },
            include: { notification: { select: { title: true } } },
            orderBy: { id: "asc" },
            take: 50,
        });
        if (rows.length)
            await this.sendBatch(rows);
        await this.readReceipts();
    }
    async sendBatch(rows) {
        try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify(rows.map((row) => ({
                    to: row.token,
                    title: "JM Beauty",
                    body: row.notification.title,
                    sound: "default",
                    data: { notificationId: row.notificationId },
                }))),
                signal: AbortSignal.timeout(10_000),
            });
            if (!response.ok)
                throw new Error(`Expo respondeu ${response.status}.`);
            const payload = await response.json();
            if (!Array.isArray(payload.data))
                throw new Error("Resposta inválida do Expo Push.");
            for (const [index, row] of rows.entries()) {
                const ticket = payload.data[index];
                if (ticket?.status === "ok" && ticket.id) {
                    await prisma.pushQueue.update({ where: { id: row.id }, data: { status: "ticket", ticketId: ticket.id, sentAt: new Date() } });
                }
                else {
                    await prisma.pushQueue.update({ where: { id: row.id }, data: { status: "failed", error: ticket?.message ?? "Falha no envio." } });
                    if (ticket?.details?.error === "DeviceNotRegistered")
                        await prisma.pushDevice.updateMany({ where: { token: row.token }, data: { enabled: false } });
                }
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Falha no envio push.";
            for (const row of rows) {
                await prisma.pushQueue.update({
                    where: { id: row.id },
                    data: {
                        attempts: { increment: 1 },
                        nextAttempt: new Date(Date.now() + Math.min(3_600_000, 60_000 * 2 ** row.attempts)),
                        error: message,
                    },
                });
            }
        }
    }
    async readReceipts() {
        const rows = await prisma.pushQueue.findMany({
            where: { status: "ticket", sentAt: { lt: new Date(Date.now() - 15 * 60_000) } },
            take: 100,
        });
        if (!rows.length)
            return;
        try {
            const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ ids: rows.map((row) => row.ticketId).filter(Boolean) }),
                signal: AbortSignal.timeout(10_000),
            });
            if (!response.ok)
                return;
            const payload = await response.json();
            for (const row of rows) {
                if (!row.ticketId)
                    continue;
                const receipt = payload.data?.[row.ticketId];
                if (!receipt)
                    continue;
                await prisma.pushQueue.update({
                    where: { id: row.id },
                    data: { status: receipt.status === "ok" ? "delivered" : "failed", error: receipt.message ?? null },
                });
                if (receipt.details?.error === "DeviceNotRegistered")
                    await prisma.pushDevice.updateMany({ where: { token: row.token }, data: { enabled: false } });
            }
        }
        catch (error) {
            console.error("Falha ao consultar recibos push:", error);
        }
    }
}
