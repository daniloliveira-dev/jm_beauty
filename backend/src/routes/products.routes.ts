import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { ProductController } from "../controllers/ProductController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createProductRoutes(controller: ProductController): Router {
  const router = Router();
  const staff = [UserRole.OPERATOR, UserRole.ADMIN];
  router.get("/products", authenticate, authorize(...staff), controller.list);
  router.post("/products", authenticate, authorize(...staff), controller.create);
  router.put("/products/:id", authenticate, authorize(...staff), controller.update);
  return router;
}
