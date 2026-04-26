import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { DEFAULT_STUDENT_FIELDS, DEFAULT_TEACHER_FIELDS } from "../utils/formDefaults";

const parse = (s: any) => ({
  ...s,
  studentFormFields: JSON.parse(s.studentFormFields ?? JSON.stringify(DEFAULT_STUDENT_FIELDS)),
  teacherFormFields: JSON.parse(s.teacherFormFields ?? JSON.stringify(DEFAULT_TEACHER_FIELDS)),
  customSections: JSON.parse(s.customSections ?? "[]"),
});

const ensureSettings = async (schoolId: number) => {
  let s = await prisma.schoolSettings.findUnique({ where: { schoolId } });
  if (!s) {
    s = await prisma.schoolSettings.create({
      data: {
        schoolId,
        studentFormFields: JSON.stringify(DEFAULT_STUDENT_FIELDS),
        teacherFormFields: JSON.stringify(DEFAULT_TEACHER_FIELDS),
        customSections: JSON.stringify([]),
      },
    });
  }
  return s;
};

export const getSettings = async (req: AuthRequest, res: Response) => {
  try {
    // Public endpoint (no auth token) — use first school
    let schoolId = req.user?.schoolId ?? null;
    if (!schoolId) {
      const first = await prisma.school.findFirst();
      if (!first) { res.json({}); return; }
      schoolId = first.id;
    }
    const s = await ensureSettings(schoolId);
    res.json(parse(s));
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const updateSettings = async (req: AuthRequest, res: Response) => {
  try {
    const schoolId = req.user!.schoolId!;
    await ensureSettings(schoolId);
    const { studentFormFields, teacherFormFields, customSections, ...rest } = req.body;
    const updated = await prisma.schoolSettings.update({
      where: { schoolId },
      data: {
        ...rest,
        ...(studentFormFields ? { studentFormFields: JSON.stringify(studentFormFields) } : {}),
        ...(teacherFormFields ? { teacherFormFields: JSON.stringify(teacherFormFields) } : {}),
        ...(customSections !== undefined ? { customSections: JSON.stringify(customSections) } : {}),
      },
    });
    res.json(parse(updated));
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
