import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { CustomerController } from "../controllers/CustomerController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createCustomerRoutes(controller: CustomerController): Router {
  const router = Router();
  router.get(["/clients", "/customers"], authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.list);
  router.post("/customers", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.create);
  router.put("/customers/:id", authenticate, authorize(UserRole.OPERATOR, UserRole.ADMIN), controller.update);
  return router;
}
