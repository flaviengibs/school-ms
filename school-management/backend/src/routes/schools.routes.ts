import { Router } from "express";
import { getSchools, getSchoolById, createSchool, updateSchool, deleteSchool, switchSchool } from "../controllers/schools.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/", authorize("OWNER"), getSchools);
router.get("/:id", authorize("OWNER"), getSchoolById);
router.post("/", authorize("OWNER"), createSchool);
router.put("/:id", authorize("OWNER"), updateSchool);
router.delete("/:id", authorize("OWNER"), deleteSchool);
router.post("/switch", authorize("OWNER"), switchSchool);

export default router;
