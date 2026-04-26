import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { notifyAll, notifyRole } from "../socket";

export const getAnnouncements = async (req: AuthRequest, res: Response) => {
  try {
    const schoolFilter = req.user!.role === "OWNER" ? {} : { schoolId: req.user!.schoolId! };
    const announcements = await prisma.announcement.findMany({
      where: {
        ...schoolFilter,
        OR: [{ targetRole: null }, { targetRole: req.user!.role }],
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(announcements);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content, targetRole } = req.body;
    const schoolId = req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ message: "No school assigned" }); return; }
    const announcement = await prisma.announcement.create({
      data: { title, content, authorId: req.user!.id, targetRole: targetRole || null, schoolId },
    });

    // Broadcast in real time
    if (targetRole) {
      notifyRole(targetRole, "new_announcement", { announcement });
    } else {
      notifyAll("new_announcement", { announcement });
    }

    res.status(201).json(announcement);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.announcement.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
