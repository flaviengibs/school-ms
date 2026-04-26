import { Router } from "express";
import { getAuditLogs, getOnlineUsers } from "../controllers/audit.controller";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

router.use(authenticate, authorize("ADMIN", "SUPER_ADMIN"));
router.get("/", getAuditLogs);
router.get("/online", getOnlineUsers);

export default router;
