import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import { notifyRole, notifyUser } from "../socket";

export const getHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { classId, subjectId } = req.query as any;
    const homework = await prisma.homework.findMany({
      where: {
        ...(classId ? { classId: Number(classId) } : {}),
        ...(subjectId ? { subjectId: Number(subjectId) } : {}),
      },
      include: {
        subject: true,
        class: true,
        teacher: { include: { user: { select: { firstName: true, lastName: true } } } },
        _count: { select: { submissions: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    res.json(homework);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const createHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, subjectId, classId, dueDate } = req.body;
    const file = (req as any).file as Express.Multer.File | undefined;
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user!.id } });
    if (!teacher) { res.status(403).json({ message: "Teacher profile not found" }); return; }

    const hw = await prisma.homework.create({
      data: {
        title, description,
        subjectId: Number(subjectId), classId: Number(classId),
        teacherId: teacher.id, dueDate: new Date(dueDate),
        fileUrl: file ? `/uploads/${file.filename}` : null,
        fileName: file ? file.originalname : null,
      },
      include: { subject: true, class: true },
    });

    // Notify students of that class
    const students = await prisma.student.findMany({
      where: { classId: Number(classId) },
      include: { user: true },
    });
    students.forEach(s => {
      notifyRole("STUDENT", "new_homework", {
        message: `New homework in ${hw.subject.name}: ${title} (due ${new Date(dueDate).toLocaleDateString()})`,
        homework: hw,
      });
    });

    res.status(201).json(hw);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const updateHomework = async (req: AuthRequest, res: Response) => {
  try {
    const hw = await prisma.homework.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(hw);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const deleteHomework = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.homework.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "Deleted" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const submitHomework = async (req: AuthRequest, res: Response) => {
  try {
    const { content } = req.body;
    const file = (req as any).file as Express.Multer.File | undefined;

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) { res.status(403).json({ message: "Student profile not found" }); return; }

    const fileUrl = file ? `/uploads/${file.filename}` : undefined;
    const fileName = file ? file.originalname : undefined;
    const fileSize = file ? file.size : undefined;

    const submission = await prisma.homeworkSubmission.upsert({
      where: { homeworkId_studentId: { homeworkId: Number(req.params.id), studentId: student.id } },
      update: { content, fileUrl, fileName, fileSize, submittedAt: new Date() },
      create: {
        homeworkId: Number(req.params.id),
        studentId: student.id,
        userId: req.user!.id,
        content,
        fileUrl,
        fileName,
        fileSize,
      },
    });
    res.status(201).json(submission);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const gradeSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const { grade, feedback } = req.body;
    const submission = await prisma.homeworkSubmission.update({
      where: { id: Number(req.params.submissionId) },
      data: { grade, feedback },
    });
    // Notify student
    notifyUser(submission.userId, "homework_graded", {
      message: `Your homework was graded: ${grade}/20`,
      submission,
    });
    res.json(submission);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const getSubmissions = async (req: AuthRequest, res: Response) => {
  try {
    const submissions = await prisma.homeworkSubmission.findMany({
      where: { homeworkId: Number(req.params.id) },
      include: { user: { select: { firstName: true, lastName: true } } },
    });
    res.json(submissions);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
