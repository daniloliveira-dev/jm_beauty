import { env } from "./config/env.js";
import { prisma, disconnectDatabase } from "./config/database.js";
import { createApp } from "./app.js";
import { runScheduledJobs } from "./jobs/ScheduledJobs.js";
import { PushNotificationService } from "./services/PushNotificationService.js";
const app = createApp();
await prisma.$connect();
const server = app.listen(env.PORT, "0.0.0.0", () => {
    console.log(`JM Beauty API pronta na porta ${env.PORT}.`);
});
const push = new PushNotificationService();
let workerBusy = false;
async function runWorker() {
    if (workerBusy)
        return;
    workerBusy = true;
    try {
        await runScheduledJobs();
        await push.deliver();
    }
    catch (error) {
        console.error("Falha em trabalhos agendados:", error);
    }
    finally {
        workerBusy = false;
    }
}
void runWorker();
const workerTimer = setInterval(() => void runWorker(), 60_000);
let closing = false;
async function shutdown(signal) {
    if (closing)
        return;
    closing = true;
    clearInterval(workerTimer);
    console.log(`Recebido ${signal}; encerrando a API.`);
    server.close(async (error) => {
        if (error) {
            console.error("Falha ao encerrar o servidor HTTP:", error);
            process.exitCode = 1;
        }
        await disconnectDatabase();
    });
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
