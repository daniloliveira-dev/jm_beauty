import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "mysql://test:test@127.0.0.1:3306/jm_beauty_test";
process.env.JWT_SECRET = "unit-test-access-secret-with-at-least-32-chars";
process.env.JWT_REFRESH_SECRET = "unit-test-refresh-secret-with-at-least-32-chars";
process.env.JWT_EXPIRES_IN = "15m";
process.env.JWT_REFRESH_EXPIRES_IN = "7d";
const [{ RegisterUserUseCase }, { LoginUseCase }, { RefreshSessionUseCase }, { AuthService }, { PasswordService }, { TokenService }, { UserRole }, { ConflictError, AuthenticationError },] = await Promise.all([
    import("../../src/useCases/auth/RegisterUserUseCase.js"),
    import("../../src/useCases/auth/LoginUseCase.js"),
    import("../../src/useCases/auth/RefreshSessionUseCase.js"),
    import("../../src/services/AuthService.js"),
    import("../../src/utils/password.js"),
    import("../../src/utils/jwt.js"),
    import("@prisma/client"),
    import("../../src/exceptions/DomainErrors.js"),
]);
class MemoryUserRepository {
    users = new Map();
    nextId = 1;
    async findByEmail(email) { return this.users.get(email) ?? null; }
    async findById(id) { return [...this.users.values()].find((user) => user.id === id) ?? null; }
    async create(data) {
        const user = {
            id: this.nextId++,
            name: data.name,
            email: data.email,
            phone: data.phone,
            passwordHash: data.passwordHash,
            role: data.role ?? UserRole.USER,
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            managerId: null,
        };
        this.users.set(user.email, user);
        return user;
    }
    async updateProfile(id, data) {
        const user = await this.findById(id);
        if (!user)
            throw new Error("not found");
        const updated = { ...user, ...data };
        this.users.set(updated.email, updated);
        return updated;
    }
    async updatePassword(id, passwordHash) {
        const user = await this.findById(id);
        if (!user)
            throw new Error("not found");
        const updated = { ...user, passwordHash };
        this.users.set(updated.email, updated);
    }
    async updateAccess(id, data) {
        const user = await this.findById(id);
        if (!user)
            throw new Error("not found");
        const updated = { ...user, ...data };
        this.users.set(updated.email, updated);
        return updated;
    }
    async deactivate(id) {
        const user = await this.findById(id);
        if (!user)
            throw new Error("not found");
        this.users.set(user.email, { ...user, active: false });
    }
    async list() { return { rows: [], total: 0 }; }
    async countActiveAdmins() { return 0; }
}
class MemoryRefreshTokenRepository {
    tokens = new Map();
    async store(userId, tokenHash, expiresAt) {
        this.tokens.set(tokenHash, { userId, expiresAt, revoked: false });
    }
    async consume(userId, tokenHash, now) {
        const token = this.tokens.get(tokenHash);
        if (!token || token.userId !== userId || token.revoked || token.expiresAt <= now)
            return false;
        token.revoked = true;
        return true;
    }
    async revoke(tokenHash) {
        const token = this.tokens.get(tokenHash);
        if (token)
            token.revoked = true;
    }
    async revokeAll(userId) {
        for (const token of this.tokens.values())
            if (token.userId === userId)
                token.revoked = true;
    }
}
test("registro cria USER e só devolve dados públicos com tokens", async () => {
    const users = new MemoryUserRepository();
    const sessions = new MemoryRefreshTokenRepository();
    const passwords = new PasswordService();
    const tokens = new TokenService();
    const auth = new AuthService(tokens, sessions);
    const register = new RegisterUserUseCase(users, passwords, auth);
    const result = await register.execute({
        name: "Cliente Teste",
        email: " TESTE@example.test ".trim().toLowerCase(),
        phone: "31999990000",
        password: "senha-forte-123",
    });
    assert.equal(result.user.role, "cliente");
    assert.equal(result.user.email, "teste@example.test");
    assert.ok(result.accessToken.length > 40);
    assert.ok(result.refreshToken.length > 40);
    assert.equal("passwordHash" in result.user, false);
    const saved = await users.findByEmail("teste@example.test");
    assert.equal(saved?.role, UserRole.USER);
    assert.equal(await passwords.verify("senha-forte-123", saved.passwordHash), true);
});
test("cadastro não duplica e login rejeita senha inválida", async () => {
    const users = new MemoryUserRepository();
    const sessions = new MemoryRefreshTokenRepository();
    const passwords = new PasswordService();
    const auth = new AuthService(new TokenService(), sessions);
    const register = new RegisterUserUseCase(users, passwords, auth);
    const login = new LoginUseCase(users, passwords, auth);
    const input = { name: "Ana Teste", email: "ana@example.test", phone: "", password: "senha-forte-456" };
    await register.execute(input);
    await assert.rejects(() => register.execute(input), ConflictError);
    await assert.rejects(() => login.execute({ email: input.email, password: "senha-errada" }), AuthenticationError);
    const session = await login.execute({ email: input.email, password: input.password });
    assert.equal(session.user.email, input.email);
});
test("login migra hash scrypt da base SQLite para bcrypt", async () => {
    const users = new MemoryUserRepository();
    const sessions = new MemoryRefreshTokenRepository();
    const passwords = new PasswordService();
    const salt = randomBytes(16).toString("hex");
    const oldHash = `${salt}:${scryptSync("senha-legada-forte", salt, 64).toString("hex")}`;
    const user = await users.create({ name: "Legado", email: "legado@example.test", phone: "", passwordHash: oldHash, role: UserRole.USER });
    const auth = new AuthService(new TokenService(), sessions);
    await new LoginUseCase(users, passwords, auth).execute({ email: user.email, password: "senha-legada-forte" });
    const migrated = await users.findByEmail(user.email);
    assert.ok(migrated?.passwordHash.startsWith("$2"));
    assert.equal(await passwords.verify("senha-legada-forte", migrated.passwordHash), true);
});
test("refresh token é rotacionado uma única vez em requisições concorrentes", async () => {
    const users = new MemoryUserRepository();
    const sessions = new MemoryRefreshTokenRepository();
    const passwords = new PasswordService();
    const tokens = new TokenService();
    const auth = new AuthService(tokens, sessions);
    const registered = await new RegisterUserUseCase(users, passwords, auth).execute({
        name: "Refresh Teste",
        email: "refresh@example.test",
        phone: "",
        password: "senha-refresh-forte",
    });
    const refresh = new RefreshSessionUseCase(users, sessions, tokens, auth);
    const attempts = await Promise.allSettled([
        refresh.execute(registered.refreshToken),
        refresh.execute(registered.refreshToken),
    ]);
    assert.equal(attempts.filter((attempt) => attempt.status === "fulfilled").length, 1);
    assert.equal(attempts.filter((attempt) => attempt.status === "rejected").length, 1);
});
