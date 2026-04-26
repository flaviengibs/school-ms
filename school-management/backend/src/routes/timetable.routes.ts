import { Router } from "express";
import { getTimetable, createTimetableEntry, updateTimetableEntry, deleteTimetableEntry } from "../controllers/timetable.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getTimetable);
router.post("/", authorize("ADMIN", "SUPER_ADMIN"), createTimetableEntry);
router.put("/:id", authorize("ADMIN", "SUPER_ADMIN"), updateTimetableEntry);
router.delete("/:id", authorize("ADMIN", "SUPER_ADMIN"), deleteTimetableEntry);

export default router;
