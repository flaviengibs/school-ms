import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

export const getSubjects = async (req: AuthRequest, res: Response) => {
  try {
    const schoolFilter = req.user!.role === "OWNER" ? {} : { schoolId: req.user!.schoolId! };
    const subjects = await prisma.subject.findMany({
      where: schoolFilter,
      include: { teacher: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const createSubject = async (req: AuthRequest, res: Response) => {
  try {
    const { name, code, coefficient, teacherId } = req.body;
    const schoolId = req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ message: "No school assigned" }); return; }
    const subject = await prisma.subject.create({ data: { name, code, coefficient, teacherId, schoolId } });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const updateSubject = async (req: AuthRequest, res: Response) => {
  try {
    const subject = await prisma.subject.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(subject);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const deleteSubject = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.subject.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Subject deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
