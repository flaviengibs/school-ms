import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

// Returns a grid: rows = students, cols = subjects, cells = average grade
export const getGradebook = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, period } = req.query as any;
    if (!classId) { res.status(400).json({ message: "classId is required" }); return; }

    const cls = await prisma.class.findUnique({
      where: { id: Number(classId) },
      include: {
        students: {
          include: { user: { select: { firstName: true, lastName: true } } },
          orderBy: { user: { lastName: "asc" } },
        },
      },
    });
    if (!cls) { res.status(404).json({ message: "Class not found" }); return; }

    // Get all grades for this class this period
    const grades = await prisma.grade.findMany({
      where: {
        student: { classId: Number(classId) },
        ...(period ? { period } : {}),
      },
      include: { subject: true },
    });

    // Collect unique subjects
    const subjectMap = new Map<number, { id: number; name: string; coefficient: number }>();
    for (const g of grades) {
      if (!subjectMap.has(g.subjectId)) {
        subjectMap.set(g.subjectId, { id: g.subjectId, name: g.subject.name, coefficient: g.subject.coefficient });
      }
    }
    const subjects = Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));

    // Build rows
    const rows = cls.students.map(student => {
      const studentGrades = grades.filter(g => g.studentId === student.id);
      const cells: Record<number, number | null> = {};

      for (const subject of subjects) {
        const sg = studentGrades.filter(g => g.subjectId === subject.id);
        if (sg.length) {
          const avg = sg.reduce((s, g) => s + (g.value / g.maxValue) * 20, 0) / sg.length;
          cells[subject.id] = r2(avg);
        } else {
          cells[subject.id] = null;
        }
      }

      // Overall weighted average
      const graded = studentGrades.filter(g => subjectMap.has(g.subjectId));
      let totalWeight = 0, weightedSum = 0;
      for (const g of graded) {
        const coeff = g.subject.coefficient;
        weightedSum += (g.value / g.maxValue) * 20 * coeff;
        totalWeight += coeff;
      }
      const overall = totalWeight > 0 ? r2(weightedSum / totalWeight) : null;

      return {
        studentId: student.id,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        cells,
        overall,
      };
    });

    // Class averages + stats per subject
    const classAverages: Record<number, number | null> = {};
    const classStats: Record<number, { min: number; max: number; median: number } | null> = {};
    for (const subject of subjects) {
      const sg = grades.filter(g => g.subjectId === subject.id).map(g => r2((g.value / g.maxValue) * 20));
      if (!sg.length) { classAverages[subject.id] = null; classStats[subject.id] = null; continue; }
      classAverages[subject.id] = r2(sg.reduce((a, b) => a + b, 0) / sg.length);
      const sorted = [...sg].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 === 0 ? r2((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
      classStats[subject.id] = { min: sorted[0], max: sorted[sorted.length - 1], median };
    }

    res.json({ class: { id: cls.id, name: cls.name }, subjects, rows, classAverages, classStats });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
