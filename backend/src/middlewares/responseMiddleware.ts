import type { NextFunction, Request, Response } from "express";

export function apiResponseEnvelope(req: Request, res: Response, next: NextFunction): void {
  if (!req.path.startsWith("/api/")) return next();
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (body && typeof body === "object" && "success" in body)
      return originalJson(body);
    if (body && typeof body === "object" && "data" in body && "meta" in body)
      return originalJson({ success: true, ...body });
    return originalJson({ success: true, data: body });
  }) as Response["json"];
  next();
}
