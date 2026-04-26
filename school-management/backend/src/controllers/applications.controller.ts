import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import bcrypt from "bcryptjs";
import { audit } from "../utils/security";

const getIp = (req: any) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.socket?.remoteAddress || "unknown";

export const submitApplication = async (req: any, res: Response) => {
  try {
    const {
      firstName, lastName, email, phone, birthDate, address, role,
      prevSchool, prevYear, prevAverage, prevGrades, motivation,
      parentFirstName, parentLastName, parentEmail, parentPhone,
      customAnswers: rawCustomAnswers,
      schoolId: bodySchoolId,
    } = req.body;

    // Resolve school — from body (public form) or from token
    const schoolId = bodySchoolId ? Number(bodySchoolId) : (req.user?.schoolId ?? null);
    if (!schoolId) { res.status(400).json({ message: "School not specified" }); return; }

    const existing = await prisma.application.findFirst({ where: { email, schoolId } });
    if (existing) { res.status(400).json({ message: "An application with this email already exists for this school" }); return; }

    const app = await prisma.application.create({
      data: {
        firstName, lastName, email, phone, birthDate, address,
        role: role || "STUDENT", prevSchool, prevYear, prevAverage,
        prevGrades: prevGrades ? JSON.stringify(prevGrades) : null,
        motivation,
        parentFirstName: parentFirstName || null,
        parentLastName: parentLastName || null,
        parentEmail: parentEmail || null,
        parentPhone: parentPhone || null,
        customAnswers: rawCustomAnswers ? JSON.stringify(rawCustomAnswers) : null,
        schoolId,
      },
    });
    res.status(201).json({ message: "Application submitted successfully", id: app.id });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const getApplications = async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query as any;
    const schoolFilter = req.user!.role === "OWNER" ? {} : { schoolId: req.user!.schoolId! };
    const apps = await prisma.application.findMany({
      where: { ...schoolFilter, ...(status ? { status } : {}) },
      orderBy: { createdAt: "desc" },
    });
    res.json(apps);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const reviewApplication = async (req: AuthRequest, res: Response) => {
  try {
    const { status, reviewNote } = req.body; // ACCEPTED | REJECTED
    const app = await prisma.application.update({
      where: { id: Number(req.params.id) },
      data: { status, reviewNote, reviewedBy: req.user!.id, reviewedAt: new Date() },
    });

    // If accepted, auto-create user account
    if (status === "ACCEPTED") {
      const existing = await prisma.user.findUnique({ where: { email: app.email } });
      if (!existing) {
        const tempPassword = `School${Math.random().toString(36).slice(2, 8)}!`;
        const hashed = await bcrypt.hash(tempPassword, 12);
        const user = await prisma.user.create({
          data: { email: app.email, password: hashed, firstName: app.firstName, lastName: app.lastName, role: app.role, phone: app.phone || undefined },
        });

        let parentRecord = null;
        if (app.role === "STUDENT") {
          const count = await prisma.student.count();
          const student = await prisma.student.create({ data: { userId: user.id, studentCode: `STU${String(count + 1).padStart(4, "0")}` } });

          // Auto-create parent account if parent info was provided
          if (app.parentEmail) {
            const existingParent = await prisma.user.findUnique({ where: { email: app.parentEmail } });
            if (!existingParent) {
              const parentTempPw = `Parent${Math.random().toString(36).slice(2, 8)}!`;
              const parentUser = await prisma.user.create({
                data: {
                  email: app.parentEmail,
                  password: await bcrypt.hash(parentTempPw, 12),
                  firstName: app.parentFirstName || "Parent",
                  lastName: app.parentLastName || app.lastName,
                  phone: app.parentPhone || undefined,
                  role: "PARENT",
                  parent: { create: {} },
                },
                include: { parent: true },
              });
              parentRecord = (parentUser as any).parent;
              if (parentRecord) {
                await prisma.student.update({ where: { id: student.id }, data: { parentId: parentRecord.id } });
              }
              await audit({ userId: req.user!.id, action: "ACCEPT_APPLICATION", entity: "Application", entityId: app.id, details: { email: app.email, tempPassword, parentEmail: app.parentEmail, parentTempPw }, ip: getIp(req) });
              res.json({ app, user: { email: user.email, tempPassword }, parent: { email: app.parentEmail, tempPassword: parentTempPw } });
              return;
            }
          }
        } else if (app.role === "TEACHER") {
          await prisma.teacher.create({ data: { userId: user.id } });
        }

        await audit({ userId: req.user!.id, action: "ACCEPT_APPLICATION", entity: "Application", entityId: app.id, details: { email: app.email, tempPassword }, ip: getIp(req) });
        res.json({ app, user: { email: user.email, tempPassword } });
        return;
      }
    }

    await audit({ userId: req.user!.id, action: `${status}_APPLICATION`, entity: "Application", entityId: app.id, ip: getIp(req) });
    res.json({ app });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
