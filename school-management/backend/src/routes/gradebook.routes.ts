import { Router } from "express";
import { getGradebook } from "../controllers/gradebook.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.get("/", authenticate, authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), getGradebook);

export default router;
