import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { AppError } from "../exceptions/AppError.js";
export const errorMiddleware = (error, req, res, _next) => {
    if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
        }));
        return res.status(400).json({
            success: false,
            message: "Verifique os campos informados.",
            ...(req.originalUrl.startsWith("/api/") ? { errors: issues } : { errors: issues }),
        });
    }
    if (error instanceof AppError)
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            code: error.code,
        });
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
            return res.status(409).json({ success: false, message: "Registro já cadastrado." });
        if (error.code === "P2025")
            return res.status(404).json({ success: false, message: "Registro não encontrado." });
    }
    console.error(error);
    return res.status(500).json({
        success: false,
        message: "Não foi possível concluir a operação.",
    });
};
