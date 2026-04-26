import { Router } from "express";
import { getSettings, updateSettings } from "../controllers/settings.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.get("/", authenticate, getSettings);
router.get("/public", getSettings as any); // no auth — used by login page
router.put("/", authenticate, authorize("SUPER_ADMIN"), updateSettings);

export default router;
