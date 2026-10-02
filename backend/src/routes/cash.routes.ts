import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { CashController } from "../controllers/CashController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createCashRoutes(controller: CashController): Router {
  const router = Router();
  const operational = [UserRole.OPERATOR, UserRole.ADMIN];
  router.get("/cash/summary", authenticate, authorize(...operational), controller.summary);
  router.get("/cash", authenticate, authorize(...operational), controller.list);
  router.post("/cash/open", authenticate, authorize(...operational), controller.open);
  router.post("/cash/:date/withdrawal", authenticate, authorize(...operational), controller.withdraw);
  router.post("/cash/:date/close", authenticate, authorize(...operational), controller.close);
  router.post("/cash/:date/reconcile", authenticate, authorize(...operational), controller.reconcile);
  router.get("/expenses", authenticate, authorize(...operational), controller.listExpenseRecords);
  router.post("/expenses", authenticate, authorize(...operational), controller.createExpenseRecord);
  return router;
}
