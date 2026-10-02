import { createManagedUserSchema, updateAccessSchema, updateProfileSchema, userListSchema } from "../dtos/users/user.dto.js";
import { paginationMeta } from "../utils/pagination.js";
import { AppError } from "../exceptions/AppError.js";
function apiRole(req, user) {
    if (!req.originalUrl.startsWith("/api/"))
        return user;
    const role = user.role === "cliente" ? "user" : user.role;
    return { ...user, role };
}
export class UserController {
    currentUser;
    updateProfile;
    listUsers;
    createUser;
    updateAccess;
    deleteUser;
    constructor(currentUser, updateProfile, listUsers, createUser, updateAccess, deleteUser) {
        this.currentUser = currentUser;
        this.updateProfile = updateProfile;
        this.listUsers = listUsers;
        this.createUser = createUser;
        this.updateAccess = updateAccess;
        this.deleteUser = deleteUser;
    }
    me = async (req, res) => {
        res.json(apiRole(req, await this.currentUser.execute(req.auth.userId)));
    };
    updateMe = async (req, res) => {
        const input = updateProfileSchema.parse(req.body);
        res.json(apiRole(req, await this.updateProfile.execute(req.auth.userId, input)));
    };
    list = async (req, res) => {
        const query = userListSchema.parse(req.query);
        const result = await this.listUsers.execute(query);
        const users = result.rows.map((user) => apiRole(req, user));
        if (req.originalUrl.startsWith("/api/")) {
            res.json({ data: users, meta: paginationMeta(query.page, query.limit, result.total) });
            return;
        }
        res.json(users);
    };
    create = async (req, res) => {
        const input = createManagedUserSchema.parse(req.body);
        res.status(201).json(apiRole(req, await this.createUser.execute(input)));
    };
    updateAccessForUser = async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1)
            throw new AppError("ID de usuário inválido.", 400);
        const input = updateAccessSchema.parse(req.body);
        res.json(apiRole(req, await this.updateAccess.execute(id, input)));
    };
    remove = async (req, res) => {
        const id = Number(req.params.id);
        if (!Number.isSafeInteger(id) || id < 1)
            throw new AppError("ID de usuário inválido.", 400);
        await this.deleteUser.execute(id);
        res.status(204).end();
    };
}
