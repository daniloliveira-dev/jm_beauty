import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

export function validate<T>(schema: ZodType<T>, field: "body" | "query" | "params" = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[field]);
    if (!result.success) return next(result.error);
    if (field === "body") req.body = result.data;
    next();
  };
}
