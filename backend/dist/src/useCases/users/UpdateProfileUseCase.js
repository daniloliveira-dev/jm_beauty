import { NotFoundError } from "../../exceptions/DomainErrors.js";
import { toPublicUser } from "../../services/UserService.js";
export class UpdateProfileUseCase {
    users;
    constructor(users) {
        this.users = users;
    }
    async execute(id, input) {
        if (!(await this.users.findById(id)))
            throw new NotFoundError("Usuário não encontrado.");
        return toPublicUser(await this.users.updateProfile(id, input));
    }
}
