import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const testDatabaseUrl = process.env.TEST_DATABASE_URL;
test("API de autenticação, sessão e autorização", { skip: !testDatabaseUrl }, async () => {
    process.env.DATABASE_URL = testDatabaseUrl;
    process.env.JWT_SECRET = "integration-access-secret-with-at-least-32-chars";
    process.env.JWT_REFRESH_SECRET = "integration-refresh-secret-with-at-least-32-chars";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
    process.env.CORS_ORIGIN = "*";
    process.env.NODE_ENV = "test";
    const [{ createApp }, { prisma }] = await Promise.all([
        import("../../src/app.js"),
        import("../../src/config/database.js"),
    ]);
    const server = createApp().listen(0);
    await new Promise((resolve, reject) => {
        server.once("listening", resolve);
        server.once("error", reject);
    });
    const address = server.address();
    if (!address || typeof address === "string")
        throw new Error("Porta de teste indisponível.");
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const email = `integration-${randomUUID()}@example.test`;
    try {
        const health = await fetch(`${baseUrl}/health`);
        assert.equal(health.status, 200);
        const registration = await fetch(`${baseUrl}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Cliente Integração", email, password: "SenhaIntegração123", phone: "" }),
        });
        assert.equal(registration.status, 201);
        const session = await registration.json();
        assert.equal(session.user.role, "cliente");
        assert.ok(session.accessToken);
        assert.ok(session.refreshToken);
        const current = await fetch(`${baseUrl}/api/auth/me`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        assert.equal(current.status, 200);
        const currentBody = await current.json();
        assert.equal(currentBody.data.role, "user");
        const denied = await fetch(`${baseUrl}/api/users`, {
            headers: { Authorization: `Bearer ${session.accessToken}` },
        });
        assert.equal(denied.status, 403);
        const duplicate = await fetch(`${baseUrl}/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Cliente Integração", email, password: "SenhaIntegração123", phone: "" }),
        });
        assert.equal(duplicate.status, 409);
    }
    finally {
        await new Promise((resolve) => server.close(() => resolve()));
        await prisma.user.deleteMany({ where: { email } });
        await prisma.$disconnect();
    }
});
