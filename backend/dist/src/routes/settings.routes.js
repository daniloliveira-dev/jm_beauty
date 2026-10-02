import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";
export function createSettingsRoutes(controller) {
    const router = Router();
    router.get("/settings", authenticate, authorize(UserRole.ADMIN), controller.get);
    router.put("/settings", authenticate, authorize(UserRole.ADMIN), controller.update);
    router.get("/settings/business-hours", authenticate, authorize(UserRole.ADMIN), controller.listHours);
    router.put("/settings/business-hours", authenticate, authorize(UserRole.ADMIN), controller.updateHours);
    return router;
}
