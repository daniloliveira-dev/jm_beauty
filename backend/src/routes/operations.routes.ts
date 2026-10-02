import { Router } from "express";
import { UserRole } from "@prisma/client";
import type { OperationsController } from "../controllers/OperationsController.js";
import { authenticate } from "../middlewares/authMiddleware.js";
import { authorize } from "../middlewares/roleMiddleware.js";

export function createOperationsRoutes(controller: OperationsController): Router {
  const router = Router();
  const staff = [UserRole.OPERATOR, UserRole.ADMIN];
  router.get("/blocks", authenticate, authorize(...staff), controller.listBlocks);
  router.post("/blocks", authenticate, authorize(...staff), controller.createBlock);
  router.delete("/blocks/:id", authenticate, authorize(...staff), controller.deleteBlock);
  router.get("/commission-rules", authenticate, authorize(...staff), controller.listCommissionRules);
  router.put("/commission-rules/:id", authenticate, authorize(UserRole.ADMIN), controller.updateCommissionRule);
  router.get("/commissions", authenticate, authorize(...staff), controller.listCommissions);
  router.post("/commissions/:id/pay", authenticate, authorize(...staff), controller.payCommission);
  router.get("/waitlist", authenticate, controller.listWaitlist);
  router.post("/waitlist", authenticate, controller.createWaitlist);
  router.get("/notifications", authenticate, controller.listNotifications);
  router.post("/push/device", authenticate, controller.registerPushDevice);
  router.delete("/push/device", authenticate, controller.removePushDevices);
  router.get("/monthly-reports", authenticate, authorize(UserRole.ADMIN), controller.listMonthlyReports);
  router.get("/monthly-reports/:month", authenticate, authorize(UserRole.ADMIN), controller.getMonthlyReport);
  router.get("/audit", authenticate, authorize(UserRole.ADMIN), controller.listAuditLogs);
  return router;
}
