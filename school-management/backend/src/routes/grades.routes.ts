import { Router } from "express";
import { getGrades, createGrade, updateGrade, deleteGrade } from "../controllers/grades.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getGrades);
router.post("/", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), createGrade);
router.put("/:id", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), updateGrade);
router.delete("/:id", authorize("ADMIN", "SUPER_ADMIN"), deleteGrade);

export default router;
