import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

export const getClasses = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.role === "OWNER"
      ? (req.query.schoolId ? Number(req.query.schoolId) : undefined)
      : req.user!.schoolId!;

    const classes = await prisma.class.findMany({
      where: schoolId ? { schoolId } : {},
      include: { _count: { select: { students: true } } },
    });
    res.json(classes);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const getClassById = async (req: AuthRequest, res: Response) => {
  try {
    const cls = await prisma.class.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        students: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        timetables: { include: { subject: true, teacher: { include: { user: { select: { firstName: true, lastName: true } } } } } },
      },
    });
    if (!cls) { res.status(404).json({ message: "Class not found" }); return; }
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const createClass = async (req: AuthRequest, res: Response) => {
  try {
    const { name, level, year } = req.body;
    const schoolId = req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ message: "No school assigned" }); return; }
    const cls = await prisma.class.create({ data: { name, level, year, schoolId } });
    res.status(201).json(cls);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const updateClass = async (req: AuthRequest, res: Response) => {
  try {
    const cls = await prisma.class.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const deleteClass = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.class.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Class deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const assignStudentToClass = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.body;
    const student = await prisma.student.update({
      where: { id: Number(studentId) },
      data: { classId: Number(req.params.id) },
    });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
