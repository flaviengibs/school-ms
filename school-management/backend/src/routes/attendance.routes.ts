import { Router } from "express";
import { getAttendances, createAttendance, updateAttendance, getStudentStats, bulkAttendance, justifyByParent } from "../controllers/attendance.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getAttendances);
router.get("/stats/:studentId", getStudentStats);
router.post("/", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), createAttendance);
router.post("/bulk", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), bulkAttendance);
router.put("/:id", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), updateAttendance);
router.put("/:id/justify", authorize("PARENT"), justifyByParent);

export default router;
