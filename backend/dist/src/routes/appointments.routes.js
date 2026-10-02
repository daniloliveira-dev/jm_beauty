import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";
export function createAppointmentRoutes(controller) {
    const router = Router();
    router.get("/availability", authenticate, controller.slots);
    router.get("/appointments", authenticate, controller.list);
    router.post("/appointments", authenticate, controller.create);
    router.patch("/appointments/:id/cancel", authenticate, controller.cancel);
    router.patch("/appointments/:id/reschedule", authenticate, controller.reschedule);
    router.patch("/appointments/:id/status", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.updateStatus);
    return router;
}
