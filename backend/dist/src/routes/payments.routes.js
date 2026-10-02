import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";
export function createPaymentRoutes(controller) {
    const router = Router();
    router.post("/payments", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.record);
    router.post("/refunds", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.refund);
    return router;
}
