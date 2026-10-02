import { loginSchema, refreshSchema, registerSchema } from "../dtos/auth/auth.dto.js";
import { forgotPasswordSchema, resetPasswordSchema } from "../dtos/auth/passwordRecovery.dto.js";
export class AuthController {
    registerUser;
    loginUser;
    refreshSession;
    logoutUser;
    getCurrentUser;
    requestPasswordReset;
    resetPassword;
    constructor(registerUser, loginUser, refreshSession, logoutUser, getCurrentUser, requestPasswordReset, resetPassword) {
        this.registerUser = registerUser;
        this.loginUser = loginUser;
        this.refreshSession = refreshSession;
        this.logoutUser = logoutUser;
        this.getCurrentUser = getCurrentUser;
        this.requestPasswordReset = requestPasswordReset;
        this.resetPassword = resetPassword;
    }
    register = async (req, res) => {
        const input = registerSchema.parse(req.body);
        res.status(201).json(this.formatSession(req, await this.registerUser.execute(input)));
    };
    login = async (req, res) => {
        const input = loginSchema.parse(req.body);
        res.json(this.formatSession(req, await this.loginUser.execute(input)));
    };
    refresh = async (req, res) => {
        const input = refreshSchema.parse(req.body);
        res.json(this.formatSession(req, await this.refreshSession.execute(input.refreshToken)));
    };
    logout = async (req, res) => {
        await this.logoutUser.execute(req.body?.refreshToken, req.auth.userId);
        res.json({ message: "Sessão encerrada." });
    };
    me = async (req, res) => {
        const user = await this.getCurrentUser.execute(req.auth.userId);
        res.json(req.originalUrl.startsWith("/api/") && user.role === "cliente" ? { ...user, role: "user" } : user);
    };
    forgot = async (req, res) => {
        const input = forgotPasswordSchema.parse(req.body);
        res.json(await this.requestPasswordReset.execute(input.email));
    };
    reset = async (req, res) => {
        const input = resetPasswordSchema.parse(req.body);
        res.json(await this.resetPassword.execute(input.token, input.password));
    };
    formatSession(req, result) {
        if (!req.originalUrl.startsWith("/api/") || result.user.role !== "cliente")
            return result;
        return { ...result, user: { ...result.user, role: "user" } };
    }
}
