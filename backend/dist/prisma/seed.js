import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function seed() {
    await prisma.salonSetting.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            salonName: "JM Beauty",
            openingTime: "09:00",
            closingTime: "19:00",
            cancelHours: 24,
            bookingAdvanceHours: 1,
        },
    });
    const hours = [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
        dayOfWeek,
        openingTime: "09:00",
        closingTime: "19:00",
        active: true,
    }));
    await prisma.businessHour.createMany({ data: hours, skipDuplicates: true });
    const baseServices = [
        { name: "Corte", description: "Corte e finalização.", price: 9000, duration: 60 },
        { name: "Manicure", description: "Cuidado e esmaltação.", price: 4500, duration: 45 },
        { name: "Design de sobrancelhas", description: "Design personalizado.", price: 4000, duration: 30 },
    ];
    for (const service of baseServices) {
        const existing = await prisma.service.findFirst({ where: { name: service.name } });
        if (!existing)
            await prisma.service.create({ data: { ...service, buffer: 0, active: true } });
    }
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (email && password) {
        if (password.length < 12)
            throw new Error("SEED_ADMIN_PASSWORD precisa ter ao menos 12 caracteres.");
        await prisma.user.upsert({
            where: { email },
            update: { role: UserRole.ADMIN, active: true },
            create: {
                name: "Administrador",
                email,
                passwordHash: await bcrypt.hash(password, 12),
                role: UserRole.ADMIN,
                active: true,
            },
        });
        console.log("Administrador do seed garantido para o e-mail configurado.");
    }
    console.log("Configurações e serviços básicos foram preparados.");
}
seed()
    .catch((error) => {
    console.error("Falha ao executar seed:", error);
    process.exitCode = 1;
})
    .finally(async () => prisma.$disconnect());
