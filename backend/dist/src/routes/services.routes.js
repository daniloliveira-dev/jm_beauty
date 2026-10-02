import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";
export function createServiceRoutes(controller) {
    const router = Router();
    router.get("/services", authenticate, controller.list);
    router.post("/services", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.create);
    router.put("/services/:id", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.update);
    return router;
}
