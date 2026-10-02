import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";
export function createReportRoutes(controller) {
    const router = Router();
    const adminOnly = [authenticate, authorize(UserRole.ADMIN)];
    router.get("/reports", ...adminOnly, controller.summary);
    router.get("/reports/daily", ...adminOnly, controller.daily);
    router.get("/reports/monthly", ...adminOnly, controller.monthly);
    router.get("/reports/services", ...adminOnly, controller.services);
    router.get("/reports/payments", ...adminOnly, controller.payments);
    router.get("/reports/appointments", ...adminOnly, controller.appointments);
    return router;
}
