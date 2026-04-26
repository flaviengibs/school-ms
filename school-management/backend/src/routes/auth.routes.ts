import { Router } from "express";
import { register, login, getMe, refresh, logout, logoutAll, changePassword, switchSchoolContext } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", authenticate, logout);
router.post("/logout-all", authenticate, logoutAll);
router.get("/me", authenticate, getMe);
router.post("/change-password", authenticate, changePassword);
router.post("/switch-school", authenticate, switchSchoolContext);

export default router;
