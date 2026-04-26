import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

export const getDashboardStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [students, teachers, classes, subjects, absencesToday, latesToday] = await Promise.all([
      prisma.student.count(),
      prisma.teacher.count(),
      prisma.class.count(),
      prisma.subject.count(),
      prisma.attendance.count({
        where: {
          status: "ABSENT",
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
      prisma.attendance.count({
        where: {
          status: "LATE",
          date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    const recentGrades = await prisma.grade.findMany({
      take: 5,
      orderBy: { date: "desc" },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: true,
      },
    });

    res.json({ students, teachers, classes, subjects, absencesToday, latesToday, recentGrades });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
