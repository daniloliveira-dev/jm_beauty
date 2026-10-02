import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { UserController } from "../controllers/UserController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createUserRoutes(controller: UserController): Router {
  const router = Router();
  router.get("/me", authenticate, controller.me);
  router.put("/me", authenticate, controller.updateMe);
  router.get("/users", authenticate, authorize(UserRole.ADMIN), controller.list);
  router.post("/users", authenticate, authorize(UserRole.ADMIN), controller.create);
  router.patch("/users/:id/access", authenticate, authorize(UserRole.ADMIN), controller.updateAccessForUser);
  router.delete("/users/:id", authenticate, authorize(UserRole.ADMIN), controller.remove);
  return router;
}
