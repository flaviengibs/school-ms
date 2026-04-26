import { Router } from "express";
import { getEvents, createEvent, updateEvent, deleteEvent } from "../controllers/events.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/", getEvents);
router.post("/", authorize("ADMIN", "SUPER_ADMIN", "TEACHER"), createEvent);
router.put("/:id", authorize("ADMIN", "SUPER_ADMIN"), updateEvent);
router.delete("/:id", authorize("ADMIN", "SUPER_ADMIN"), deleteEvent);

export default router;
