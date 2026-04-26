import { Router } from "express";
import { getSubjects, createSubject, updateSubject, deleteSubject } from "../controllers/subjects.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getSubjects);
router.post("/", authorize("ADMIN", "SUPER_ADMIN"), createSubject);
router.put("/:id", authorize("ADMIN", "SUPER_ADMIN"), updateSubject);
router.delete("/:id", authorize("ADMIN", "SUPER_ADMIN"), deleteSubject);

export default router;
