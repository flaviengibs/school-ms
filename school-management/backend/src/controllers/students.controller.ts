import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { search, classId } = req.query as any;
    const students = await prisma.student.findMany({
      where: {
        ...(classId ? { classId: Number(classId) } : {}),
        ...(search ? {
          user: {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
            ],
          },
        } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, blameCount: true } },
        class: true,
      },
      orderBy: { user: { lastName: "asc" } },
    });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const getStudentById = async (req: AuthRequest, res: Response) => {
  try {
    const student = await prisma.student.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, status: true, blameCount: true } },
        class: true,
        grades: { include: { subject: true }, orderBy: { date: "desc" } },
        bulletins: { include: { class: true }, orderBy: { createdAt: "desc" } },
      },
    });
    if (!student) { res.status(404).json({ message: "Student not found" }); return; }
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
