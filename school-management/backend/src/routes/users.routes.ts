import { Router } from "express";
import { getUsers, getUserById, updateUser, deleteUser, createStudentWithParent, linkParentToStudent } from "../controllers/users.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate);
router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/student", authorize("ADMIN", "SUPER_ADMIN"), createStudentWithParent);
router.put("/student-parent", authorize("ADMIN", "SUPER_ADMIN"), linkParentToStudent);
router.put("/:id", updateUser); // self-update allowed; role changes restricted in controller
router.delete("/:id", authorize("SUPER_ADMIN", "OWNER"), deleteUser);

export default router;
