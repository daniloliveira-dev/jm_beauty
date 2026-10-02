import { createHash } from "node:crypto";
import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";
import { authConfig } from "../config/auth.js";

export type TokenSubject = { id: number; role: string };

export class TokenService {
  createAccessToken(user: TokenSubject): string {
    return jwt.sign(
      { role: user.role, type: "access" },
      authConfig.accessSecret,
      {
        subject: String(user.id),
        expiresIn: authConfig.accessExpiresIn as SignOptions["expiresIn"],
      },
    );
  }

  createRefreshToken(user: TokenSubject): string {
    return jwt.sign(
      { role: user.role, type: "refresh" },
      authConfig.refreshSecret,
      {
        subject: String(user.id),
        expiresIn: authConfig.refreshExpiresIn as SignOptions["expiresIn"],
      },
    );
  }

  verifyAccessToken(token: string): JwtPayload & { sub: string; role: string } {
    const payload = jwt.verify(token, authConfig.accessSecret);
    if (typeof payload === "string" || payload.type !== "access")
      throw new Error("Token de acesso inválido.");
    return payload as JwtPayload & { sub: string; role: string };
  }

  verifyRefreshToken(token: string): JwtPayload & { sub: string; role: string } {
    const payload = jwt.verify(token, authConfig.refreshSecret);
    if (typeof payload === "string" || payload.type !== "refresh")
      throw new Error("Token de atualização inválido.");
    return payload as JwtPayload & { sub: string; role: string };
  }

  hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
