import { AuthorizationError, AuthenticationError } from "../exceptions/DomainErrors.js";
export function authorize(...allowedRoles) {
    return (req, _res, next) => {
        if (!req.auth)
            return next(new AuthenticationError());
        if (!allowedRoles.includes(req.auth.role))
            return next(new AuthorizationError("Acesso exclusivo para este perfil."));
        next();
    };
}
