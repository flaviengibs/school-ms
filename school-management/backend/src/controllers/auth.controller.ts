import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma";
import { signToken } from "../utils/jwt";
import {
  generateRefreshToken, saveRefreshToken, validateRefreshToken,
  revokeRefreshToken, revokeAllUserTokens,
  checkBruteForce, recordLoginAttempt,
  validatePasswordStrength, audit,
} from "../utils/security";

const getIp = (req: Request) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket.remoteAddress || "unknown";

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;

    const isAdminCreating = req.body._adminCreated === true;
    const finalPassword = isAdminCreating
      ? `Tmp${Math.random().toString(36).slice(2, 8)}!${Math.floor(Math.random() * 90 + 10)}`
      : password;

    const pwError = validatePasswordStrength(finalPassword);
    if (pwError && !isAdminCreating) { res.status(400).json({ message: pwError }); return; }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(400).json({ message: "Email already in use" }); return; }

    const hashed = await bcrypt.hash(finalPassword, 12);
    const user = await prisma.user.create({
      data: {
        email, password: hashed, firstName, lastName,
        role: role || "STUDENT", phone,
        schoolId: req.body.schoolId ? Number(req.body.schoolId) : null,
        mustChangePassword: isAdminCreating,
      },
    });

    if (user.role === "STUDENT") {
      const count = await prisma.student.count();
      await prisma.student.create({ data: { userId: user.id, studentCode: `STU${String(count + 1).padStart(4, "0")}` } });
    } else if (user.role === "TEACHER") {
      await prisma.teacher.create({ data: { userId: user.id } });
    } else if (user.role === "PARENT") {
      await prisma.parent.create({ data: { userId: user.id } });
    } else if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
      await prisma.admin.create({ data: { userId: user.id } });
    }

    await audit({ userId: user.id, action: "REGISTER", ip: getIp(req) });

    const accessToken = signToken({ id: user.id, role: user.role, email: user.email, schoolId: user.schoolId });
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user.id, refreshToken);

    res.status(201).json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, schoolId: user.schoolId, mustChangePassword: user.mustChangePassword },
      ...(isAdminCreating ? { tempPassword: finalPassword } : {}),
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const login = async (req: Request, res: Response) => {
  const ip = getIp(req);
  try {
    const { email, password } = req.body;

    const blocked = await checkBruteForce(email, ip);
    if (blocked) { res.status(429).json({ message: "Too many failed attempts. Try again in 15 minutes." }); return; }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      await recordLoginAttempt(email, ip, false);
      res.status(400).json({ message: "Invalid credentials" }); return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await recordLoginAttempt(email, ip, false);
      await audit({ userId: user.id, action: "LOGIN_FAILED", ip });
      res.status(400).json({ message: "Invalid credentials" }); return;
    }

    await recordLoginAttempt(email, ip, true);
    await audit({ userId: user.id, action: "LOGIN", ip });

    const accessToken = signToken({ id: user.id, role: user.role, email: user.email, schoolId: user.schoolId });
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(user.id, refreshToken);

    res.json({
      accessToken, refreshToken,
      user: { id: user.id, email: user.email, role: user.role, firstName: user.firstName, lastName: user.lastName, schoolId: user.schoolId, mustChangePassword: user.mustChangePassword },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) { res.status(400).json({ message: "Refresh token required" }); return; }

    const record = await validateRefreshToken(refreshToken);
    if (!record) { res.status(401).json({ message: "Invalid or expired refresh token" }); return; }

    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) { res.status(401).json({ message: "User not found" }); return; }

    await revokeRefreshToken(refreshToken);
    const newRefreshToken = generateRefreshToken();
    await saveRefreshToken(user.id, newRefreshToken);

    const accessToken = signToken({ id: user.id, role: user.role, email: user.email, schoolId: user.schoolId });
    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const logout = async (req: any, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await revokeRefreshToken(refreshToken);
    await audit({ userId: req.user?.id, action: "LOGOUT", ip: getIp(req) });
    res.json({ message: "Logged out" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const logoutAll = async (req: any, res: Response) => {
  try {
    await revokeAllUserTokens(req.user.id);
    await audit({ userId: req.user.id, action: "LOGOUT_ALL", ip: getIp(req) });
    res.json({ message: "All sessions revoked" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { student: true, teacher: true, parent: true, admin: true },
    });
    if (!user) { res.status(404).json({ message: "User not found" }); return; }
    const { password: _, ...safe } = user;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const switchSchoolContext = async (req: any, res: Response) => {
  try {
    if (req.user?.role !== "OWNER") { res.status(403).json({ message: "Owner only" }); return; }
    const { schoolId } = req.body;
    const school = await prisma.school.findUnique({ where: { id: Number(schoolId) } });
    if (!school) { res.status(404).json({ message: "School not found" }); return; }
    // Issue a scoped token — same user id, role becomes SUPER_ADMIN for this school
    const contextToken = signToken({ id: req.user.id, role: "SUPER_ADMIN", email: req.user.email, schoolId: Number(schoolId), isOwnerContext: true });
    res.json({ contextToken, school: { id: school.id, name: school.name } });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) { res.status(404).json({ message: "User not found" }); return; }

    // If mustChangePassword, skip current password check
    if (!user.mustChangePassword) {
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) { res.status(400).json({ message: "Current password is incorrect" }); return; }
    }

    const pwError = validatePasswordStrength(newPassword);
    if (pwError) { res.status(400).json({ message: pwError }); return; }

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed, mustChangePassword: false } });
    await revokeAllUserTokens(user.id);
    await audit({ userId: user.id, action: "CHANGE_PASSWORD", ip: getIp(req) });

    res.json({ message: "Password changed. Please log in again." });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
