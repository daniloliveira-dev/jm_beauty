import { ConflictError, NotFoundError } from "../../exceptions/DomainErrors.js";
import { toPublicUser } from "../../services/UserService.js";
export class UpdateUserAccessUseCase {
    users;
    constructor(users) {
        this.users = users;
    }
    async execute(id, input) {
        const target = await this.users.findById(id);
        if (!target)
            throw new NotFoundError("Usuário não encontrado.");
        const removingActiveAdmin = target.role === "ADMIN" && (input.role !== "ADMIN" || !input.active);
        if (removingActiveAdmin && (await this.users.countActiveAdmins()) <= 1)
            throw new ConflictError("Não é permitido remover ou bloquear o último administrador ativo.");
        return toPublicUser(await this.users.updateAccess(id, input));
    }
}
