import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

export const getTimetable = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, teacherId } = req.query as any;
    const timetable = await prisma.timetable.findMany({
      where: {
        ...(classId ? { classId: Number(classId) } : {}),
        ...(teacherId ? { teacherId: Number(teacherId) } : {}),
      },
      include: {
        subject: true,
        class: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ day: "asc" }, { startTime: "asc" }],
    });
    res.json(timetable);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const createTimetableEntry = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId, teacherId, day, startTime, endTime, room } = req.body;
    const entry = await prisma.timetable.create({
      data: { classId, subjectId, teacherId, day, startTime, endTime, room },
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const updateTimetableEntry = async (req: AuthRequest, res: Response) => {
  try {
    const entry = await prisma.timetable.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const deleteTimetableEntry = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.timetable.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
