import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { notifyUser } from "../socket";
import { audit } from "../utils/security";

const getIp = (req: any) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket?.remoteAddress || "unknown";

const SANCTION_LABELS: Record<string, string> = {
  CROSS: "cross", DETENTION: "detention", WORK_INTEREST: "work of general interest",
  BLAME: "blame", WARNING: "major warning",
};

export const getSanctions = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, type } = req.query as any;
    const sanctions = await prisma.sanction.findMany({
      where: {
        ...(userId ? { userId: Number(userId) } : {}),
        ...(type ? { type } : {}),
      },
      include: { user: { select: { firstName: true, lastName: true, email: true, status: true, blameCount: true, crossCount: true, warningCount: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(sanctions);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const issueSanction = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, type, reason, hours, scheduledAt } = req.body;
    const ip = getIp(req);

    const target = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!target) { res.status(404).json({ message: "User not found" }); return; }
    if (target.role !== "STUDENT") { res.status(400).json({ message: "Sanctions can only be issued to students" }); return; }

    // Get school settings for thresholds
    const settings = await prisma.schoolSettings.findFirst();
    const crossThreshold = settings?.crossThreshold ?? 5;
    const blameSuspendDays = settings?.blameSuspendDays ?? 3;

    const sanction = await prisma.sanction.create({
      data: {
        userId: Number(userId),
        issuedBy: req.user!.id,
        type,
        reason,
        hours: hours ? parseFloat(hours) : null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    let newStatus = target.status;
    let newBlameCount = target.blameCount;
    let newCrossCount = target.crossCount;
    let newWarningCount = target.warningCount;
    let suspendUntil: Date | null = null;
    let autoSanction: string | null = null;

    if (type === "CROSS") {
      newCrossCount += 1;
      // Auto-create detention when threshold reached
      if (newCrossCount >= crossThreshold) {
        await prisma.sanction.create({
          data: { userId: Number(userId), issuedBy: req.user!.id, type: "DETENTION", reason: `Auto-detention: ${newCrossCount} crosses accumulated`, hours: 1 },
        });
        newCrossCount = 0; // reset crosses after detention
        autoSanction = `Threshold reached — 1h detention automatically issued`;
      }
    } else if (type === "BLAME") {
      newBlameCount += 1;
      if (newBlameCount >= 3) {
        suspendUntil = new Date(Date.now() + blameSuspendDays * 24 * 60 * 60 * 1000);
        newStatus = "SUSPENDED";
        newBlameCount = 0; // reset after suspension
        await prisma.sanction.update({ where: { id: sanction.id }, data: { suspendUntil } });
      }
    } else if (type === "WARNING") {
      newWarningCount += 1;
      if (newWarningCount >= 3) {
        newStatus = "BANNED";
        autoSanction = "3 major warnings — account permanently excluded";
      }
    }

    await prisma.user.update({
      where: { id: Number(userId) },
      data: { blameCount: newBlameCount, crossCount: newCrossCount, warningCount: newWarningCount, status: newStatus, suspendUntil },
    });

    // Notify the user
    let notifMsg = `You received a ${SANCTION_LABELS[type] || type}: ${reason}`;
    if (newStatus === "SUSPENDED") notifMsg += ` — Your account is suspended until ${suspendUntil?.toLocaleDateString()}.`;
    if (newStatus === "BANNED") notifMsg += " — Your account has been permanently excluded.";
    if (autoSanction) notifMsg += ` (${autoSanction})`;
    notifyUser(Number(userId), "sanction_issued", { message: notifMsg });

    await audit({ userId: req.user!.id, action: `ISSUE_${type}`, entity: "User", entityId: Number(userId), details: { reason }, ip });

    res.status(201).json({
      sanction, newStatus, newBlameCount, newCrossCount, newWarningCount,
      autoSanction, suspendUntil,
    });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const revokeSanction = async (req: AuthRequest, res: Response) => {
  try {
    const sanction = await prisma.sanction.findUnique({ where: { id: Number(req.params.id) } });
    if (!sanction) { res.status(404).json({ message: "Sanction not found" }); return; }

    await prisma.sanction.delete({ where: { id: sanction.id } });

    // Recompute counts from remaining sanctions
    const remaining = await prisma.sanction.findMany({ where: { userId: sanction.userId } });
    const blameCount = remaining.filter(s => s.type === "BLAME").length;
    const crossCount = remaining.filter(s => s.type === "CROSS").length;
    const warningCount = remaining.filter(s => s.type === "WARNING").length;

    const user = await prisma.user.findUnique({ where: { id: sanction.userId } });
    const newStatus = warningCount >= 3 ? "BANNED" : blameCount >= 3 ? "SUSPENDED" : "ACTIVE";

    await prisma.user.update({
      where: { id: sanction.userId },
      data: { blameCount, crossCount, warningCount, status: newStatus, suspendUntil: newStatus !== "SUSPENDED" ? null : user?.suspendUntil },
    });

    await audit({ userId: req.user!.id, action: `REVOKE_${sanction.type}`, entity: "User", entityId: sanction.userId, ip: getIp(req) });
    res.json({ message: "Sanction revoked", blameCount, crossCount, warningCount, newStatus });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const resolveSanction = async (req: AuthRequest, res: Response) => {
  try {
    const sanction = await prisma.sanction.update({
      where: { id: Number(req.params.id) },
      data: { resolved: true, resolvedAt: new Date() },
    });
    res.json(sanction);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const setUserStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { status, suspendDays } = req.body;
    const suspendUntil = status === "SUSPENDED" && suspendDays
      ? new Date(Date.now() + Number(suspendDays) * 24 * 60 * 60 * 1000)
      : null;

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { status, suspendUntil },
      select: { id: true, firstName: true, lastName: true, status: true, suspendUntil: true },
    });

    const msgs: Record<string, string> = {
      SUSPENDED: `Your account has been suspended${suspendUntil ? ` until ${suspendUntil.toLocaleDateString()}` : ""}.`,
      ACTIVE: "Your account has been reactivated.",
      BANNED: "Your account has been permanently excluded.",
    };
    notifyUser(user.id, "account_status_changed", { message: msgs[status] || `Status changed to ${status}` });
    await audit({ userId: req.user!.id, action: `SET_STATUS_${status}`, entity: "User", entityId: user.id, ip: getIp(req) });
    res.json(user);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
