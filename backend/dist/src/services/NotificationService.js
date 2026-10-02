export class NotificationService {
    async enqueue(tx, userId, title) {
        const notification = await tx.notification.create({ data: { userId, title } });
        const devices = await tx.pushDevice.findMany({
            where: { userId, enabled: true },
            select: { token: true },
        });
        if (devices.length) {
            await tx.pushQueue.createMany({
                data: devices.map(({ token }) => ({
                    notificationId: notification.id,
                    token,
                    status: "pending",
                    nextAttempt: new Date(),
                })),
                skipDuplicates: true,
            });
        }
    }
}
