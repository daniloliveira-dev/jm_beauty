export class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = "APP_ERROR") {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = new.target.name;
    }
}
