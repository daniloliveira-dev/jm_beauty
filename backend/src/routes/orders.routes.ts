import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { OrderController } from "../controllers/OrderController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();
  const staff = [authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN)];
  router.get("/appointments/:id/order", ...staff, controller.get);
  router.post("/appointments/:id/order/items", ...staff, controller.addItem);
  router.delete("/appointments/:id/order/items/:item", ...staff, controller.removeItem);
  router.put("/appointments/:id/order/adjustment", ...staff, controller.adjust);
  return router;
}
