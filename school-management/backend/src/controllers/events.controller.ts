import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { notifyAll, notifyRole } from "../socket";

export const getEvents = async (req: AuthRequest, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      where: {
        OR: [{ targetRole: null }, { targetRole: req.user!.role }],
      },
      orderBy: { startDate: "asc" },
    });
    res.json(events);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const createEvent = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, startDate, endDate, type, targetRole } = req.body;
    const event = await prisma.event.create({
      data: { title, description, startDate: new Date(startDate), endDate: endDate ? new Date(endDate) : null, type: type || "EVENT", targetRole: targetRole || null, createdBy: req.user!.id, schoolId: req.user!.schoolId! },
    });
    if (targetRole) notifyRole(targetRole, "new_event", { event });
    else notifyAll("new_event", { event });
    res.status(201).json(event);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const updateEvent = async (req: AuthRequest, res: Response) => {
  try {
    const event = await prisma.event.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(event);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const deleteEvent = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.event.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
