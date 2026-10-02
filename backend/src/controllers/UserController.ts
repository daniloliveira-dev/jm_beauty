import type { Request, Response } from "express";
import { createManagedUserSchema, updateAccessSchema, updateProfileSchema, userListSchema } from "../dtos/users/user.dto.js";
import { CreateManagedUserUseCase } from "../useCases/users/CreateManagedUserUseCase.js";
import { GetCurrentUserUseCase } from "../useCases/users/GetCurrentUserUseCase.js";
import { ListUsersUseCase } from "../useCases/users/ListUsersUseCase.js";
import { UpdateProfileUseCase } from "../useCases/users/UpdateProfileUseCase.js";
import { UpdateUserAccessUseCase } from "../useCases/users/UpdateUserAccessUseCase.js";
import { DeleteUserUseCase } from "../useCases/users/DeleteUserUseCase.js";
import { paginationMeta } from "../utils/pagination.js";
import { AppError } from "../exceptions/AppError.js";

function apiRole<T extends { role: string }>(req: Request, user: T): T {
  if (!req.originalUrl.startsWith("/api/")) return user;
  const role = user.role === "cliente" ? "user" : user.role;
  return { ...user, role } as T;
}

export class UserController {
  constructor(
    private readonly currentUser: GetCurrentUserUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly createUser: CreateManagedUserUseCase,
    private readonly updateAccess: UpdateUserAccessUseCase,
    private readonly deleteUser: DeleteUserUseCase,
  ) {}

  me = async (req: Request, res: Response): Promise<void> => {
    res.json(apiRole(req, await this.currentUser.execute(req.auth!.userId)));
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const input = updateProfileSchema.parse(req.body);
    res.json(apiRole(req, await this.updateProfile.execute(req.auth!.userId, input)));
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = userListSchema.parse(req.query);
    const result = await this.listUsers.execute(query);
    const users = result.rows.map((user) => apiRole(req, user));
    if (req.originalUrl.startsWith("/api/")) {
      res.json({ data: users, meta: paginationMeta(query.page, query.limit, result.total) });
      return;
    }
    res.json(users);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createManagedUserSchema.parse(req.body);
    res.status(201).json(apiRole(req, await this.createUser.execute(input)));
  };

  updateAccessForUser = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new AppError("ID de usuário inválido.", 400);
    const input = updateAccessSchema.parse(req.body);
    res.json(apiRole(req, await this.updateAccess.execute(id, input)));
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) throw new AppError("ID de usuário inválido.", 400);
    await this.deleteUser.execute(id);
    res.status(204).end();
  };
}
