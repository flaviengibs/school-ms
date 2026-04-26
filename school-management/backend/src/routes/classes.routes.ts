import { Router } from "express";
import { getClasses, getClassById, createClass, updateClass, deleteClass, assignStudentToClass } from "../controllers/classes.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getClasses);
router.get("/:id", getClassById);
router.post("/", authorize("ADMIN", "SUPER_ADMIN"), createClass);
router.put("/:id", authorize("ADMIN", "SUPER_ADMIN"), updateClass);
router.delete("/:id", authorize("ADMIN", "SUPER_ADMIN"), deleteClass);
router.post("/:id/assign-student", authorize("ADMIN", "SUPER_ADMIN"), assignStudentToClass);

export default router;
