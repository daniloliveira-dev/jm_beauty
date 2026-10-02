import type { Request, Response } from "express";
import { loginSchema, refreshSchema, registerSchema } from "../dtos/auth/auth.dto.js";
import { LogoutUseCase } from "../useCases/auth/LogoutUseCase.js";
import { LoginUseCase } from "../useCases/auth/LoginUseCase.js";
import { RefreshSessionUseCase } from "../useCases/auth/RefreshSessionUseCase.js";
import { RegisterUserUseCase } from "../useCases/auth/RegisterUserUseCase.js";
import { GetCurrentUserUseCase } from "../useCases/users/GetCurrentUserUseCase.js";
import { forgotPasswordSchema, resetPasswordSchema } from "../dtos/auth/passwordRecovery.dto.js";
import { RequestPasswordResetUseCase } from "../useCases/auth/RequestPasswordResetUseCase.js";
import { ResetPasswordUseCase } from "../useCases/auth/ResetPasswordUseCase.js";

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
    private readonly logoutUser: LogoutUseCase,
    private readonly getCurrentUser: GetCurrentUserUseCase,
    private readonly requestPasswordReset: RequestPasswordResetUseCase,
    private readonly resetPassword: ResetPasswordUseCase,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const input = registerSchema.parse(req.body);
    res.status(201).json(this.formatSession(req, await this.registerUser.execute(input)));
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const input = loginSchema.parse(req.body);
    res.json(this.formatSession(req, await this.loginUser.execute(input)));
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const input = refreshSchema.parse(req.body);
    res.json(this.formatSession(req, await this.refreshSession.execute(input.refreshToken)));
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.logoutUser.execute(req.body?.refreshToken, req.auth!.userId);
    res.json({ message: "Sessão encerrada." });
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.getCurrentUser.execute(req.auth!.userId);
    res.json(req.originalUrl.startsWith("/api/") && user.role === "cliente" ? { ...user, role: "user" } : user);
  };

  forgot = async (req: Request, res: Response): Promise<void> => {
    const input = forgotPasswordSchema.parse(req.body);
    res.json(await this.requestPasswordReset.execute(input.email));
  };

  reset = async (req: Request, res: Response): Promise<void> => {
    const input = resetPasswordSchema.parse(req.body);
    res.json(await this.resetPassword.execute(input.token, input.password));
  };

  private formatSession<T extends { user: { role: string } }>(req: Request, result: T): T {
    if (!req.originalUrl.startsWith("/api/") || result.user.role !== "cliente") return result;
    return { ...result, user: { ...result.user, role: "user" } };
  }
}
