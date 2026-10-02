import "dotenv/config";
import mysql from "mysql2/promise";
async function main() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl)
        throw new Error("Defina DATABASE_URL no arquivo .env.");
    const parsed = new URL(databaseUrl);
    const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    if (!databaseName || !/^[A-Za-z0-9_]+$/.test(databaseName))
        throw new Error("O nome do database em DATABASE_URL contém caracteres inválidos.");
    const connection = await mysql.createConnection({
        host: parsed.hostname,
        port: Number(parsed.port || 3306),
        user: decodeURIComponent(parsed.username),
        password: decodeURIComponent(parsed.password),
        ssl: parsed.searchParams.get("ssl") === "true" ? {} : undefined,
    });
    try {
        const [rows] = await connection.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [databaseName]);
        if (rows.length) {
            console.log(`Database ${databaseName} já existia.`);
            return;
        }
        const creator = process.env.MYSQL_ROOT_PASSWORD
            ? await mysql.createConnection({
                host: parsed.hostname,
                port: Number(parsed.port || 3306),
                user: "root",
                password: process.env.MYSQL_ROOT_PASSWORD,
                ssl: parsed.searchParams.get("ssl") === "true" ? {} : undefined,
            })
            : connection;
        try {
            await creator.query(`CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            console.log(`Database ${databaseName} criado.`);
        }
        finally {
            if (creator !== connection)
                await creator.end();
        }
    }
    finally {
        await connection.end();
    }
}
main().catch((error) => {
    console.error("Não foi possível preparar o database MySQL:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
