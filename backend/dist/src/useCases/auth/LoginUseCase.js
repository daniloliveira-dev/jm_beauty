import { AuthenticationError } from "../../exceptions/DomainErrors.js";
export class LoginUseCase {
    users;
    passwords;
    auth;
    constructor(users, passwords, auth) {
        this.users = users;
        this.passwords = passwords;
        this.auth = auth;
    }
    async execute(input) {
        const user = await this.users.findByEmail(input.email.trim().toLowerCase());
        if (!user || !user.active || !(await this.passwords.verify(input.password, user.passwordHash)))
            throw new AuthenticationError("E-mail ou senha inválidos.");
        if (this.passwords.needsRehash(user.passwordHash))
            await this.users.updatePassword(user.id, await this.passwords.rehash(input.password));
        return this.auth.issueSession(user);
    }
}
