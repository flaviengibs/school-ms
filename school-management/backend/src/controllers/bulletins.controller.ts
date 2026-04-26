import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const weightedAvg = (grades: { value: number; maxValue: number; subject: { coefficient: number } }[]) => {
  if (!grades.length) return 0;
  let tw = 0, ws = 0;
  for (const g of grades) { ws += (g.value / g.maxValue) * 20 * g.subject.coefficient; tw += g.subject.coefficient; }
  return tw > 0 ? r2(ws / tw) : 0;
};

export const getBulletins = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, classId, period } = req.query as any;
    const role = req.user!.role;
    let allowedStudentIds: number[] | null = null;

    if (role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
      if (!student) { res.json([]); return; }
      allowedStudentIds = [student.id];
    } else if (role === "PARENT") {
      const parent = await prisma.parent.findUnique({ where: { userId: req.user!.id }, include: { students: true } });
      if (!parent) { res.json([]); return; }
      allowedStudentIds = parent.students.map(s => s.id);
    }

    if (studentId && allowedStudentIds !== null && !allowedStudentIds.includes(Number(studentId))) {
      res.status(403).json({ message: "Access denied" }); return;
    }

    const where: any = {
      ...(classId && allowedStudentIds === null ? { classId: Number(classId) } : {}),
      ...(period ? { period } : {}),
    };
    if (allowedStudentIds !== null) {
      where.studentId = studentId ? Number(studentId) : { in: allowedStudentIds };
    } else if (studentId) {
      where.studentId = Number(studentId);
    }

    const bulletins = await prisma.bulletin.findMany({
      where,
      include: {
        student: { include: { user: { select: { firstName: true, lastName: true } } } },
        class: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(bulletins);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const generateBulletin = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, period } = req.body;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { class: { include: { students: true } } },
    });
    if (!student?.classId) { res.status(400).json({ message: "Student has no class assigned" }); return; }

    const studentGrades = await prisma.grade.findMany({ where: { studentId, period }, include: { subject: true } });
    if (!studentGrades.length) { res.status(400).json({ message: "No grades found for this period" }); return; }

    const subjectIds = [...new Set(studentGrades.map(g => g.subjectId))];
    const subjectData = await Promise.all(subjectIds.map(async (subjectId) => {
      const sg = studentGrades.filter(g => g.subjectId === subjectId);
      const subject = sg[0].subject;
      const studentAvg = r2(sg.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / sg.length);
      const classGrades = await prisma.grade.findMany({ where: { subjectId, period, student: { classId: student.classId! } } });
      const classAvg = classGrades.length ? r2(classGrades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / classGrades.length) : null;
      return { subjectId, subjectName: subject.name, coefficient: subject.coefficient, studentAvg, classAvg, gradeCount: sg.length };
    }));

    const studentAverage = weightedAvg(studentGrades);
    const classmateIds = student.class!.students.map(s => s.id);
    const classmateAverages: number[] = [];
    for (const cmId of classmateIds) {
      const cmGrades = await prisma.grade.findMany({ where: { studentId: cmId, period }, include: { subject: true } });
      if (cmGrades.length) classmateAverages.push(weightedAvg(cmGrades));
    }
    const classAverage = classmateAverages.length ? r2(classmateAverages.reduce((a, b) => a + b, 0) / classmateAverages.length) : null;

    const bulletin = await prisma.bulletin.upsert({
      where: { studentId_period: { studentId, period } },
      update: { average: studentAverage, classAverage, classId: student.classId, classSize: classmateIds.length, subjectData: JSON.stringify(subjectData) },
      create: { studentId, classId: student.classId, period, average: studentAverage, classAverage, classSize: classmateIds.length, subjectData: JSON.stringify(subjectData) },
    });

    const allBulletins = await prisma.bulletin.findMany({ where: { classId: student.classId, period }, orderBy: { average: "desc" } });
    for (let i = 0; i < allBulletins.length; i++) {
      await prisma.bulletin.update({ where: { id: allBulletins[i].id }, data: { rank: i + 1 } });
    }

    const updated = await prisma.bulletin.findUnique({ where: { id: bulletin.id } });
    res.status(201).json(updated);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const generateBulkBulletins = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, period } = req.body;
    const students = await prisma.student.findMany({ where: { classId: Number(classId) } });
    if (!students.length) { res.status(400).json({ message: "No students in this class" }); return; }

    const results: { studentId: number; success: boolean; error?: string }[] = [];

    for (const student of students) {
      try {
        const grades = await prisma.grade.findMany({ where: { studentId: student.id, period }, include: { subject: true } });
        if (!grades.length) { results.push({ studentId: student.id, success: false, error: "No grades" }); continue; }

        let tw = 0, ws = 0;
        for (const g of grades) { ws += (g.value / g.maxValue) * 20 * g.subject.coefficient; tw += g.subject.coefficient; }
        const average = tw > 0 ? r2(ws / tw) : 0;

        const subjectIds = [...new Set(grades.map(g => g.subjectId))];
        const subjectData = await Promise.all(subjectIds.map(async subjectId => {
          const sg = grades.filter(g => g.subjectId === subjectId);
          const subj = sg[0].subject;
          const studentAvg = r2(sg.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / sg.length);
          const classGrades = await prisma.grade.findMany({ where: { subjectId, period, student: { classId: Number(classId) } } });
          const classAvg = classGrades.length ? r2(classGrades.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / classGrades.length) : null;
          return { subjectId, subjectName: subj.name, coefficient: subj.coefficient, studentAvg, classAvg, gradeCount: sg.length };
        }));

        const classmateAvgs: number[] = [];
        for (const cmId of students.map(s => s.id)) {
          const cmGrades = await prisma.grade.findMany({ where: { studentId: cmId, period }, include: { subject: true } });
          if (cmGrades.length) { let ctw = 0, cws = 0; for (const g of cmGrades) { cws += (g.value / g.maxValue) * 20 * g.subject.coefficient; ctw += g.subject.coefficient; } classmateAvgs.push(ctw > 0 ? r2(cws / ctw) : 0); }
        }
        const classAverage = classmateAvgs.length ? r2(classmateAvgs.reduce((a, b) => a + b, 0) / classmateAvgs.length) : null;

        await prisma.bulletin.upsert({
          where: { studentId_period: { studentId: student.id, period } },
          update: { average, classAverage, classId: Number(classId), classSize: students.length, subjectData: JSON.stringify(subjectData) },
          create: { studentId: student.id, classId: Number(classId), period, average, classAverage, classSize: students.length, subjectData: JSON.stringify(subjectData) },
        });
        results.push({ studentId: student.id, success: true });
      } catch (e: any) { results.push({ studentId: student.id, success: false, error: e.message }); }
    }

    const all = await prisma.bulletin.findMany({ where: { classId: Number(classId), period }, orderBy: { average: "desc" } });
    for (let i = 0; i < all.length; i++) await prisma.bulletin.update({ where: { id: all[i].id }, data: { rank: i + 1 } });

    res.json({ generated: results.filter(r => r.success).length, skipped: results.filter(r => !r.success).length, results });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const updateBulletin = async (req: AuthRequest, res: Response) => {
  try {
    const bulletin = await prisma.bulletin.update({ where: { id: Number(req.params.id) }, data: req.body });
    res.json(bulletin);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
