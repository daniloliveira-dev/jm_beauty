import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { createInterface as createReadline } from "node:readline";
import { stdin as input, stdout as output } from "node:process";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { z } from "zod";
const prisma = new PrismaClient();
const prompt = createInterface({ input, output });
const emailSchema = z.email();
async function askPassword() {
    output.write("Senha (mínimo 12 caracteres): ");
    if (!input.isTTY || typeof input.setRawMode !== "function") {
        const line = createReadline({ input, output, terminal: false });
        return new Promise((resolve, reject) => {
            line.once("line", (value) => { line.close(); resolve(value); });
            line.once("error", reject);
        });
    }
    input.setRawMode(true);
    input.resume();
    return new Promise((resolve, reject) => {
        let password = "";
        const finish = (error) => {
            input.setRawMode(false);
            input.pause();
            input.removeListener("data", onData);
            output.write("\n");
            if (error)
                reject(error);
            else
                resolve(password);
        };
        const onData = (chunk) => {
            for (const character of chunk.toString("utf8")) {
                if (character === "\u0003")
                    return finish(new Error("Operação cancelada."));
                if (character === "\r" || character === "\n")
                    return finish();
                if (character === "\u007f" || character === "\b") {
                    if (password.length) {
                        password = password.slice(0, -1);
                        output.write("\b \b");
                    }
                }
                else if (character >= " ") {
                    password += character;
                    output.write("*");
                }
            }
        };
        input.on("data", onData);
    });
}
async function main() {
    try {
        const name = (await prompt.question("Nome: ")).trim();
        const email = (await prompt.question("E-mail: ")).trim().toLowerCase();
        const phone = (await prompt.question("Telefone: ")).trim();
        prompt.close();
        const password = await askPassword();
        if (name.length < 2 || !emailSchema.safeParse(email).success || password.length < 12)
            throw new Error("Nome, e-mail ou senha inválidos. Senha precisa ter pelo menos 12 caracteres.");
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            if (existing.role === UserRole.ADMIN) {
                const update = (await prompt.question("Este usuário já é ADMIN. Atualizar nome, telefone e senha? (s/N): ")).trim().toLowerCase();
                if (update !== "s" && update !== "sim") {
                    console.log("Nenhuma alteração realizada.");
                    return;
                }
            }
            else {
                const promote = (await prompt.question("E-mail já cadastrado. Deseja promover este usuário a ADMIN? (s/N): ")).trim().toLowerCase();
                if (promote !== "s" && promote !== "sim") {
                    console.log("Nenhuma alteração realizada.");
                    return;
                }
            }
            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: existing.id },
                    data: {
                        name,
                        phone,
                        passwordHash: await bcrypt.hash(password, 12),
                        role: UserRole.ADMIN,
                        active: true,
                    },
                });
                await tx.refreshToken.updateMany({
                    where: { userId: existing.id, revokedAt: null },
                    data: { revokedAt: new Date() },
                });
            });
            console.log("Usuário atualizado para ADMIN; sessões anteriores foram revogadas.");
            return;
        }
        await prisma.user.create({
            data: {
                name,
                email,
                phone,
                passwordHash: await bcrypt.hash(password, 12),
                role: UserRole.ADMIN,
                active: true,
            },
        });
        console.log(`ADMIN criado: ${email}`);
    }
    finally {
        prompt.close();
        await prisma.$disconnect();
    }
}
main().catch((error) => {
    console.error("Não foi possível criar o administrador:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
