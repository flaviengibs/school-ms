import { Router } from "express";
import { getSchools, getSchoolById, createSchool, updateSchool, deleteSchool, switchSchool, getPublicSchools } from "../controllers/schools.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Public — no auth required, used by the application form
router.get("/public", getPublicSchools);

router.use(authenticate);
router.get("/", authorize("OWNER"), getSchools);
router.get("/:id", authorize("OWNER"), getSchoolById);
router.post("/", authorize("OWNER"), createSchool);
router.put("/:id", authorize("OWNER"), updateSchool);
router.delete("/:id", authorize("OWNER"), deleteSchool);
router.post("/switch", authorize("OWNER"), switchSchool);

export default router;
