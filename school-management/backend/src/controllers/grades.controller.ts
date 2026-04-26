import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { audit } from "../utils/security";
import { notifyUser, notifyRole } from "../socket";

const getIp = (req: any) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket?.remoteAddress || "unknown";

export const getGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, subjectId, period } = req.query as any;
    const role = req.user!.role;

    // Resolve which studentIds this user is allowed to see
    let allowedStudentIds: number[] | null = null; // null = no restriction (admin/teacher)

    if (role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
      if (!student) { res.json([]); return; }
      allowedStudentIds = [student.id];
    } else if (role === "PARENT") {
      const parent = await prisma.parent.findUnique({
        where: { userId: req.user!.id },
        include: { students: true },
      });
      if (!parent) { res.json([]); return; }
      allowedStudentIds = parent.students.map(s => s.id);
    }

    // If a specific studentId was requested, verify access
    if (studentId && allowedStudentIds !== null && !allowedStudentIds.includes(Number(studentId))) {
      res.status(403).json({ message: "Access denied" }); return;
    }

    const where: any = {
      ...(subjectId ? { subjectId: Number(subjectId) } : {}),
      ...(period ? { period } : {}),
    };

    if (allowedStudentIds !== null) {
      // Restrict to own/children grades
      where.studentId = studentId ? Number(studentId) : { in: allowedStudentIds };
    } else if (studentId) {
      where.studentId = Number(studentId);
    }

    const grades = await prisma.grade.findMany({
      where,
      include: {
        subject: true,
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { date: "desc" },
    });
    res.json(grades);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const createGrade = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, subjectId, value, maxValue, comment, period, teacherId: bodyTeacherId } = req.body;

    // Admins can pass teacherId directly; teachers use their own profile
    let teacherId: number;
    if (["ADMIN", "SUPER_ADMIN"].includes(req.user!.role)) {
      if (bodyTeacherId) {
        teacherId = Number(bodyTeacherId);
      } else {
        // Use first available teacher as fallback
        const anyTeacher = await prisma.teacher.findFirst();
        if (!anyTeacher) { res.status(400).json({ message: "No teacher found. Please create a teacher first." }); return; }
        teacherId = anyTeacher.id;
      }
    } else {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) { res.status(403).json({ message: "Teacher profile not found" }); return; }
      teacherId = teacher.id;
    }

    const grade = await prisma.grade.create({
      data: { studentId, subjectId, teacherId, value, maxValue: maxValue || 20, comment, period },
      include: { subject: true, student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });

    // Notify the student in real time
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student) {
      notifyUser(student.userId, "new_grade", {
        message: `New grade in ${grade.subject.name}: ${value}/${maxValue || 20}`,
        grade,
      });
    }
    await audit({ userId: req.user!.id, action: "CREATE_GRADE", entity: "Grade", entityId: grade.id, ip: getIp(req) });

    res.status(201).json(grade);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const updateGrade = async (req: AuthRequest, res: Response) => {
  try {
    const grade = await prisma.grade.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(grade);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const deleteGrade = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.grade.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Grade deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
