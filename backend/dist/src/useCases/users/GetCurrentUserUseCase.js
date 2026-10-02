import { NotFoundError } from "../../exceptions/DomainErrors.js";
import { toPublicUser } from "../../services/UserService.js";
export class GetCurrentUserUseCase {
    users;
    constructor(users) {
        this.users = users;
    }
    async execute(id) {
        const user = await this.users.findById(id);
        if (!user)
            throw new NotFoundError("Usuário não encontrado.");
        return toPublicUser(user);
    }
}
