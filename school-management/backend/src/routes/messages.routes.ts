import { Router } from "express";
import { getInbox, getSent, sendMessage, markRead, deleteMessage, getUnreadCount } from "../controllers/messages.controller";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);
router.get("/inbox", getInbox);
router.get("/sent", getSent);
router.get("/unread-count", getUnreadCount);
router.post("/", sendMessage);
router.put("/:id/read", markRead);
router.delete("/:id", deleteMessage);

export default router;
