import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { audit } from "../utils/security";
import { notifyUser, notifyRole } from "../socket";

const getIp = (req: any) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket?.remoteAddress || "unknown";

export const getAttendances = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, status, from, to } = req.query as any;
    const role = req.user!.role;

    let allowedStudentIds: number[] | null = null;

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

    if (studentId && allowedStudentIds !== null && !allowedStudentIds.includes(Number(studentId))) {
      res.status(403).json({ message: "Access denied" }); return;
    }

    const where: any = {
      ...(status ? { status } : {}),
      ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
    };

    if (allowedStudentIds !== null) {
      where.studentId = studentId ? Number(studentId) : { in: allowedStudentIds };
    } else if (studentId) {
      where.studentId = Number(studentId);
    }

    const attendances = await prisma.attendance.findMany({
      where,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { date: "desc" },
    });
    res.json(attendances);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const createAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, status, minutes, reason, date } = req.body;

    let teacherId: number;
    if (["ADMIN", "SUPER_ADMIN"].includes(req.user!.role)) {
      const anyTeacher = await prisma.teacher.findFirst();
      if (!anyTeacher) { res.status(400).json({ message: "No teacher found. Please create a teacher first." }); return; }
      teacherId = anyTeacher.id;
    } else {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) { res.status(403).json({ message: "Teacher profile not found" }); return; }
      teacherId = teacher.id;
    }

    const attendance = await prisma.attendance.create({
      data: { studentId, teacherId, status, minutes, reason, date: date ? new Date(date) : undefined },
      include: { student: { include: { user: { select: { firstName: true, lastName: true } } } } },
    });

    // Notify student and admins
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (student) {
      const statusLabel: Record<string, string> = { ABSENT: "absent", LATE: "late", EXCUSED: "excused" };
      if (status !== "PRESENT") {
        notifyUser(student.userId, "attendance_update", {
          message: `You have been marked ${statusLabel[status] || status}${minutes ? ` (${minutes} min delay)` : ""}`,
          attendance,
        });
      }
    }
    notifyRole("ADMIN", "attendance_update", { attendance });
    notifyRole("SUPER_ADMIN", "attendance_update", { attendance });
    await audit({ userId: req.user!.id, action: "CREATE_ATTENDANCE", entity: "Attendance", entityId: attendance.id, ip: getIp(req) });

    res.status(201).json(attendance);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const attendance = await prisma.attendance.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const getStudentStats = async (req: AuthRequest, res: Response) => {
  try {
    const studentId = Number(req.params.studentId);
    const [absences, lates, total] = await Promise.all([
      prisma.attendance.count({ where: { studentId, status: "ABSENT" } }),
      prisma.attendance.count({ where: { studentId, status: "LATE" } }),
      prisma.attendance.count({ where: { studentId } }),
    ]);
    const justified = await prisma.attendance.count({ where: { studentId, status: "ABSENT", justified: true } });
    res.json({ absences, lates, total, justified, unjustified: absences - justified });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const justifyByParent = async (req: AuthRequest, res: Response) => {
  try {
    const attendanceId = Number(req.params.id);
    const { reason } = req.body;

    // Find the parent profile
    const parent = await prisma.parent.findUnique({ where: { userId: req.user!.id } });
    if (!parent) { res.status(403).json({ message: "Parent profile not found" }); return; }

    // Check the absence belongs to one of their children
    const attendance = await prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: { student: true },
    });
    if (!attendance) { res.status(404).json({ message: "Attendance record not found" }); return; }
    if (attendance.student.parentId !== parent.id) {
      res.status(403).json({ message: "This student is not your child" }); return;
    }
    if (attendance.status !== "ABSENT" && attendance.status !== "LATE") {
      res.status(400).json({ message: "Only absences and delays can be justified" }); return;
    }

    const updated = await prisma.attendance.update({
      where: { id: attendanceId },
      data: { justified: true, reason: reason || attendance.reason },
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
export const bulkAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, date, records } = req.body;
    let teacherId: number;
    if (["ADMIN", "SUPER_ADMIN"].includes(req.user!.role)) {
      const anyTeacher = await prisma.teacher.findFirst();
      if (!anyTeacher) { res.status(400).json({ message: "No teacher found" }); return; }
      teacherId = anyTeacher.id;
    } else {
      const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
      if (!teacher) { res.status(403).json({ message: "Teacher profile not found" }); return; }
      teacherId = teacher.id;
    }

    const created = await Promise.all(
      records.map((r: any) =>
        prisma.attendance.create({
          data: { studentId: r.studentId, teacherId, status: r.status, minutes: r.minutes, reason: r.reason, date: date ? new Date(date) : new Date() },
        })
      )
    );

    // Notify students who are absent or late
    for (const r of records) {
      if (r.status !== "PRESENT") {
        const student = await prisma.student.findUnique({ where: { id: r.studentId } });
        if (student) {
          notifyUser(student.userId, "attendance_update", {
            message: `You have been marked ${r.status.toLowerCase()}`,
          });
        }
      }
    }

    notifyRole("ADMIN", "attendance_update", { classId, count: created.length });
    notifyRole("SUPER_ADMIN", "attendance_update", { classId, count: created.length });
    res.status(201).json({ created: created.length });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
