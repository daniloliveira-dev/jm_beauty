import { Prisma, UserRole } from "@prisma/client";
import { ConflictError } from "../../exceptions/DomainErrors.js";
export class RegisterUserUseCase {
    users;
    passwords;
    auth;
    constructor(users, passwords, auth) {
        this.users = users;
        this.passwords = passwords;
        this.auth = auth;
    }
    async execute(input) {
        const email = input.email.trim().toLowerCase();
        if (await this.users.findByEmail(email))
            throw new ConflictError("E-mail já cadastrado.");
        let user;
        try {
            user = await this.users.create({
                name: input.name.trim(),
                email,
                phone: input.phone,
                passwordHash: await this.passwords.hash(input.password),
                role: UserRole.USER,
            });
        }
        catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002")
                throw new ConflictError("E-mail já cadastrado.");
            throw error;
        }
        return this.auth.issueSession(user);
    }
}
