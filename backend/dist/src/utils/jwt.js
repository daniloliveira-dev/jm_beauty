import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { authConfig } from "../config/auth.js";
export class TokenService {
    createAccessToken(user) {
        return jwt.sign({ role: user.role, type: "access" }, authConfig.accessSecret, {
            subject: String(user.id),
            expiresIn: authConfig.accessExpiresIn,
        });
    }
    createRefreshToken(user) {
        return jwt.sign({ role: user.role, type: "refresh" }, authConfig.refreshSecret, {
            subject: String(user.id),
            expiresIn: authConfig.refreshExpiresIn,
        });
    }
    verifyAccessToken(token) {
        const payload = jwt.verify(token, authConfig.accessSecret);
        if (typeof payload === "string" || payload.type !== "access")
            throw new Error("Token de acesso inválido.");
        return payload;
    }
    verifyRefreshToken(token) {
        const payload = jwt.verify(token, authConfig.refreshSecret);
        if (typeof payload === "string" || payload.type !== "refresh")
            throw new Error("Token de atualização inválido.");
        return payload;
    }
    hashToken(token) {
        return createHash("sha256").update(token).digest("hex");
    }
}
