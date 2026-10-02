import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { PaymentController } from "../controllers/PaymentController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createPaymentRoutes(controller: PaymentController): Router {
  const router = Router();
  router.post("/payments", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.record);
  router.post("/refunds", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.refund);
  return router;
}
