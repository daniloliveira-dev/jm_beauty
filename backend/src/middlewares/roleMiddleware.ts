import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";
import { AuthorizationError, AuthenticationError } from "../exceptions/DomainErrors.js";

export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) return next(new AuthenticationError());
    if (!allowedRoles.includes(req.auth.role))
      return next(new AuthorizationError("Acesso exclusivo para este perfil."));
    next();
  };
}
