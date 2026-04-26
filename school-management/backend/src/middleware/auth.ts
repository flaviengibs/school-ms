import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";

export interface AuthRequest extends Request {
  user?: { id: number; role: string; email: string; schoolId: number | null };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) { res.status(401).json({ message: "Unauthorized" }); return; }
  try {
    const token = header.split(" ")[1];
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role, email: payload.email, schoolId: payload.schoolId ?? null };
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (...roles: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden" }); return;
    }
    next();
  };

// Middleware that ensures the user belongs to the school they're accessing
// OWNER bypasses this check
export const requireSchool = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === "OWNER") { next(); return; }
  if (!req.user?.schoolId) { res.status(403).json({ message: "No school assigned" }); return; }
  next();
};
