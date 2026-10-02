import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";
export function createProfessionalRoutes(controller) {
    const router = Router();
    router.get("/professionals", authenticate, controller.list);
    router.post("/professionals", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.create);
    router.put("/professionals/:id", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.update);
    return router;
}
