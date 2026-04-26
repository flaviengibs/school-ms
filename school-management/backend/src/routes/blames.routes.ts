import { Router } from "express";
import { getSanctions, issueSanction, revokeSanction, resolveSanction, setUserStatus } from "../controllers/blames.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), getSanctions);
router.post("/", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), issueSanction);
router.delete("/:id", authorize("SUPER_ADMIN"), revokeSanction);
router.put("/:id/resolve", authorize("TEACHER", "ADMIN", "SUPER_ADMIN"), resolveSanction);
router.put("/users/:id/status", authorize("ADMIN", "SUPER_ADMIN"), setUserStatus);

export default router;
