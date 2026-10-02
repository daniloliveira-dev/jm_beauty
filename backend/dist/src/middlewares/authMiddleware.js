import { prisma } from "../config/database.js";
import { TokenService } from "../utils/jwt.js";
import { AuthenticationError } from "../exceptions/DomainErrors.js";
const tokens = new TokenService();
export async function authenticate(req, _res, next) {
    try {
        const header = req.header("authorization");
        const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
        if (!token)
            throw new AuthenticationError();
        const payload = tokens.verifyAccessToken(token);
        const userId = Number(payload.sub);
        if (!Number.isSafeInteger(userId) || userId < 1)
            throw new AuthenticationError("Token inválido.");
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, active: true },
        });
        if (!user?.active)
            throw new AuthenticationError("Sessão inválida.");
        req.auth = { userId: user.id, role: user.role };
        next();
    }
    catch (error) {
        next(error instanceof AuthenticationError
            ? error
            : new AuthenticationError("Entre novamente para continuar."));
    }
}
