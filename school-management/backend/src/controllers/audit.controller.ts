import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

export const getAuditLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, action, limit = "50" } = req.query as any;
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(userId ? { userId: Number(userId) } : {}),
        ...(action ? { action: { contains: action } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Number(limit),
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const getOnlineUsers = async (_req: AuthRequest, res: Response) => {
  // Actual online list is managed by socket.io; this returns recent logins as fallback
  try {
    const recent = await prisma.auditLog.findMany({
      where: { action: "LOGIN" },
      orderBy: { createdAt: "desc" },
      take: 20,
      distinct: ["userId"],
    });
    res.json(recent);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
