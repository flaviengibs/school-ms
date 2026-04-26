import { Router } from "express";
import { exportStudents, exportGrades, exportAttendance } from "../controllers/export.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN", "TEACHER"));
router.get("/students", exportStudents);
router.get("/grades", exportGrades);
router.get("/attendance", exportAttendance);

export default router;
