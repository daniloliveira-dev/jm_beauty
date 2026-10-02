import { AppError } from "./AppError.js";
export class AuthenticationError extends AppError {
    constructor(message = "Autenticação necessária.") {
        super(message, 401, "UNAUTHENTICATED");
    }
}
export class AuthorizationError extends AppError {
    constructor(message = "Acesso não autorizado.") {
        super(message, 403, "FORBIDDEN");
    }
}
export class ValidationError extends AppError {
    constructor(message = "Verifique os campos informados.") {
        super(message, 400, "VALIDATION_ERROR");
    }
}
export class NotFoundError extends AppError {
    constructor(message = "Registro não encontrado.") {
        super(message, 404, "NOT_FOUND");
    }
}
export class ConflictError extends AppError {
    constructor(message = "Conflito ao processar a operação.") {
        super(message, 409, "CONFLICT");
    }
}
