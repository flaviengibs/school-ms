import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.get("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), getDashboardStats);

export default router;
