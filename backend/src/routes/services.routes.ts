import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { ServiceController } from "../controllers/ServiceController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createServiceRoutes(controller: ServiceController): Router {
  const router = Router();
  router.get("/services", authenticate, controller.list);
  router.post("/services", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.create);
  router.put("/services/:id", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.update);
  router.delete("/services/:id", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.delete);
  return router;
}
