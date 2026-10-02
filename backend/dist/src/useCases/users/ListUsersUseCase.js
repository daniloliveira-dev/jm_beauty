import { toPublicUser } from "../../services/UserService.js";
export class ListUsersUseCase {
    users;
    constructor(users) {
        this.users = users;
    }
    async execute(input) {
        const result = await this.users.list({
            skip: (input.page - 1) * input.limit,
            take: input.limit,
            search: input.search,
        });
        return { rows: result.rows.map(toPublicUser), total: result.total };
    }
}
