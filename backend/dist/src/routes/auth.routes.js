import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { authenticate } from "../middlewares/authMiddleware.js";
export function createAuthRoutes(controller) {
    const router = Router();
    const authRateLimit = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: Number(process.env.AUTH_RATE_LIMIT_MAX || 30),
        standardHeaders: "draft-8",
        legacyHeaders: false,
    });
    router.post("/auth/register", authRateLimit, controller.register);
    router.post("/auth/login", authRateLimit, controller.login);
    router.post("/auth/refresh", authRateLimit, controller.refresh);
    router.post("/auth/forgot", authRateLimit, controller.forgot);
    router.post("/auth/reset", authRateLimit, controller.reset);
    router.post("/auth/logout", authenticate, controller.logout);
    router.get("/auth/me", authenticate, controller.me);
    return router;
}
