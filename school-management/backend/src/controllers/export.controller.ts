import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

const csv = (rows: string[][]): string =>
  rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");

const send = (res: Response, filename: string, content: string) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + content); // BOM for Excel
};

export const exportStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { classId } = req.query as any;
    const students = await prisma.student.findMany({
      where: classId ? { classId: Number(classId) } : {},
      include: {
        user: true,
        class: true,
        parent: { include: { user: { select: { firstName: true, lastName: true, email: true, phone: true } } } },
      },
      orderBy: { user: { lastName: "asc" } },
    });
    const rows = [
      ["Code", "Last name", "First name", "Email", "Phone", "Class", "Status", "Enrolled", "Parent name", "Parent email", "Parent phone"],
      ...students.map(s => [
        s.studentCode, s.user.lastName, s.user.firstName, s.user.email, s.user.phone || "",
        s.class?.name || "", s.user.status, new Date(s.enrollDate).toLocaleDateString(),
        s.parent ? `${s.parent.user.firstName} ${s.parent.user.lastName}` : "",
        s.parent?.user.email || "", s.parent?.user.phone || "",
      ]),
    ];
    send(res, "students.csv", csv(rows));
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const exportGrades = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, period } = req.query as any;
    const grades = await prisma.grade.findMany({
      where: {
        ...(period ? { period } : {}),
        ...(classId ? { student: { classId: Number(classId) } } : {}),
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        subject: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: [{ student: { user: { lastName: "asc" } } }, { subject: { name: "asc" } }],
    });
    const rows = [
      ["Student", "Subject", "Grade", "Max", "Normalized /20", "Period", "Teacher", "Comment", "Date"],
      ...grades.map(g => [
        `${g.student.user.lastName} ${g.student.user.firstName}`,
        g.subject.name,
        String(g.value), String(g.maxValue),
        String(Math.round((g.value / g.maxValue) * 20 * 100) / 100),
        g.period,
        `${g.teacher.user.firstName} ${g.teacher.user.lastName}`,
        g.comment || "", new Date(g.date).toLocaleDateString(),
      ]),
    ];
    send(res, "grades.csv", csv(rows));
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const exportAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, from, to } = req.query as any;
    const records = await prisma.attendance.findMany({
      where: {
        ...(classId ? { student: { classId: Number(classId) } } : {}),
        ...(from || to ? { date: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to) } : {}) } } : {}),
      },
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
      },
      orderBy: { date: "desc" },
    });
    const rows = [
      ["Student", "Date", "Status", "Delay (min)", "Reason", "Justified", "Teacher"],
      ...records.map(r => [
        `${r.student.user.lastName} ${r.student.user.firstName}`,
        new Date(r.date).toLocaleDateString(),
        r.status, String(r.minutes || ""), r.reason || "",
        r.justified ? "Yes" : "No",
        `${r.teacher.user.firstName} ${r.teacher.user.lastName}`,
      ]),
    ];
    send(res, "attendance.csv", csv(rows));
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
