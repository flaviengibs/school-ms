import { Router } from "express";
import { submitApplication, getApplications, reviewApplication } from "../controllers/applications.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.post("/", submitApplication); // public
router.get("/", authenticate, authorize("ADMIN", "SUPER_ADMIN"), getApplications);
router.put("/:id/review", authenticate, authorize("ADMIN", "SUPER_ADMIN"), reviewApplication);

export default router;
