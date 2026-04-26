import { Router } from "express";
import { getAnnouncements, createAnnouncement, deleteAnnouncement } from "../controllers/announcements.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getAnnouncements);
router.post("/", authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), createAnnouncement);
router.delete("/:id", authorize("ADMIN", "SUPER_ADMIN"), deleteAnnouncement);

export default router;
