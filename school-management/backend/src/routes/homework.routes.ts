import { Router } from "express";
import { getHomework, createHomework, updateHomework, deleteHomework, submitHomework, gradeSubmission, getSubmissions } from "../controllers/homework.controller";
import { authenticate, authorize } from "../middleware/auth";
import { upload } from "../middleware/upload";

const router = Router();
router.use(authenticate);
router.get("/", getHomework);
router.post("/", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), upload.single("file"), createHomework);
router.put("/:id", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), updateHomework);
router.delete("/:id", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), deleteHomework);
router.post("/:id/submit", authorize("STUDENT"), upload.single("file"), submitHomework);
router.get("/:id/submissions", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), getSubmissions);
router.put("/:id/submissions/:submissionId/grade", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), gradeSubmission);

export default router;
