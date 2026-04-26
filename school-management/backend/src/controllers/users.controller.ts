import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import bcrypt from "bcryptjs";
import { validatePasswordStrength } from "../utils/security";

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { role, search } = req.query as any;
    const schoolFilter = req.user!.role === "OWNER" ? {} : { schoolId: req.user!.schoolId! };
    const users = await prisma.user.findMany({
      where: {
        ...schoolFilter,
        ...(role ? { role } : {}),
        ...(search ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ],
        } : {}),
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true, createdAt: true, status: true },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        student: { include: { class: true } },
        teacher: { include: { subjects: true } },
        parent: { include: { students: { include: { user: true } } } },
      },
    });
    if (!user) { res.status(404).json({ message: "User not found" }); return; }
    const { password: _, ...safe } = user as any;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const targetId = Number(req.params.id);
    const isSelf = req.user!.id === targetId;
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "OWNER"].includes(req.user!.role);

    // Non-admins can only update themselves
    if (!isSelf && !isAdmin) {
      res.status(403).json({ message: "Forbidden" }); return;
    }

    const { firstName, lastName, phone, role } = req.body;

    // Only admins can change roles, and only for others
    const data: Record<string, any> = { firstName, lastName, phone };
    if (role && isAdmin && !isSelf) data.role = role;

    const user = await prisma.user.update({
      where: { id: targetId },
      data,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, phone: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const linkParentToStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId, parentId } = req.body;
    const student = await prisma.student.update({
      where: { id: Number(studentId) },
      data: { parentId: Number(parentId) },
    });
    res.json(student);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};

export const createStudentWithParent = async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, email, phone, password, classId, parentFirstName, parentLastName, parentEmail, parentPhone, parentPassword, existingParentId } = req.body;
    const schoolId = req.user!.schoolId;
    if (!schoolId) { res.status(400).json({ message: "No school assigned" }); return; }

    const pwError = validatePasswordStrength(password);
    if (pwError) { res.status(400).json({ message: `Student password: ${pwError}` }); return; }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) { res.status(400).json({ message: "A user with this email already exists" }); return; }

    const count = await prisma.student.count();
    const studentCode = `STU${String(count + 1).padStart(4, "0")}`;

    const studentUser = await prisma.user.create({
      data: {
        email, password: await bcrypt.hash(password, 12),
        firstName, lastName, phone, role: "STUDENT", schoolId,
        student: { create: { studentCode, ...(classId ? { classId: Number(classId) } : {}) } },
      },
      include: { student: true },
    });

    let parentUser: any = null;
    let parentRecord: any = null;

    if (existingParentId) {
      parentRecord = await prisma.parent.findUnique({ where: { id: Number(existingParentId) } });
      if (parentRecord) {
        await prisma.student.update({ where: { id: studentUser.student!.id }, data: { parentId: parentRecord.id } });
        parentUser = await prisma.user.findUnique({ where: { id: parentRecord.userId } });
      }
    } else if (parentEmail) {
      const existingParentUser = await prisma.user.findUnique({ where: { email: parentEmail } });
      if (existingParentUser && existingParentUser.role === "PARENT") {
        parentRecord = await prisma.parent.findUnique({ where: { userId: existingParentUser.id } });
        parentUser = existingParentUser;
      } else if (!existingParentUser) {
        const parentPw = parentPassword || `Parent${Math.random().toString(36).slice(2, 8)}!A`;
        parentUser = await prisma.user.create({
          data: {
            email: parentEmail, password: await bcrypt.hash(parentPw, 12),
            firstName: parentFirstName || "Parent", lastName: parentLastName || lastName,
            phone: parentPhone, role: "PARENT", schoolId,
            parent: { create: {} },
          },
          include: { parent: true },
        });
        parentRecord = (parentUser as any).parent;
        (parentUser as any).tempPassword = parentPw;
      } else {
        res.status(400).json({ message: "This email is already used by a non-parent account" }); return;
      }
      if (parentRecord) {
        await prisma.student.update({ where: { id: studentUser.student!.id }, data: { parentId: parentRecord.id } });
      }
    }

    const { password: _sp, ...safeStudent } = studentUser as any;
    const safeParent = parentUser ? (() => { const { password: _pp, ...p } = parentUser; return p; })() : null;
    res.status(201).json({ student: safeStudent, parent: safeParent, parentTempPassword: parentUser?.tempPassword || null });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err });
  }
};
