import { Router } from "express";
import { getBulletins, generateBulletin, generateBulkBulletins, updateBulletin } from "../controllers/bulletins.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getBulletins);
router.post("/generate", authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), generateBulletin);
router.post("/generate-bulk", authorize("ADMIN", "SUPER_ADMIN"), generateBulkBulletins);
router.put("/:id", authorize("ADMIN", "SUPER_ADMIN"), updateBulletin);

export default router;
