// ============================================
// src/routes/land.routes.ts
// ============================================
import { Router } from "express";
import landController from "@/controllers/land.controller";

const router = Router();

// ============================================
// LAND SUBMISSIONS
// ============================================
router.post("/submissions", landController.create);
router.get("/submissions", landController.getAll);
router.get("/submissions/:id", landController.getOne);
router.patch("/submissions/:id", landController.update);
router.get("/submissions/filter/status/:status", landController.getByFilter);

// ============================================
// STATISTICS
// ============================================
router.get("/statistics", landController.getStatistics);

export default router;
