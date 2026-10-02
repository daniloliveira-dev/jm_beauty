import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { ProfessionalController } from "../controllers/ProfessionalController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createProfessionalRoutes(controller: ProfessionalController): Router {
  const router = Router();
  router.get("/professionals", authenticate, controller.list);
  router.post("/professionals", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.create);
  router.put("/professionals/:id", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.update);
  router.delete("/professionals/:id", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.delete);
  return router;
}
