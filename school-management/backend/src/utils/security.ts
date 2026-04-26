import crypto from "crypto";
import prisma from "./prisma";

// Refresh token — random 64-byte hex string, expires in 30 days
export const generateRefreshToken = () => crypto.randomBytes(64).toString("hex");

export const saveRefreshToken = async (userId: number, token: string) => {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return prisma.refreshToken.create({ data: { token, userId, expiresAt } });
};

export const revokeRefreshToken = async (token: string) => {
  await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
};

export const revokeAllUserTokens = async (userId: number) => {
  await prisma.refreshToken.updateMany({ where: { userId }, data: { revoked: true } });
};

export const validateRefreshToken = async (token: string) => {
  const record = await prisma.refreshToken.findUnique({ where: { token } });
  if (!record || record.revoked || record.expiresAt < new Date()) return null;
  return record;
};

// Audit log
export const audit = async (params: {
  userId?: number; action: string; entity?: string;
  entityId?: number; details?: object; ip?: string;
}) => {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details ? JSON.stringify(params.details) : undefined,
      ip: params.ip,
    },
  }).catch(() => {}); // never block the main flow
};

// Brute-force: max 10 failed attempts in 15 minutes
export const checkBruteForce = async (email: string, ip: string): Promise<boolean> => {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const failures = await prisma.loginAttempt.count({
    where: { email, success: false, createdAt: { gte: since } },
  });
  return failures >= 10;
};

export const recordLoginAttempt = async (email: string, ip: string, success: boolean) => {
  await prisma.loginAttempt.create({ data: { email, ip, success } });
};

// Password strength: min 8 chars, 1 uppercase, 1 number, 1 special char
export const validatePasswordStrength = (password: string): string | null => {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character";
  return null;
};
