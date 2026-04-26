import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../utils/prisma";
import bcrypt from "bcryptjs";
import { DEFAULT_STUDENT_FIELDS, DEFAULT_TEACHER_FIELDS } from "../utils/formDefaults";

export const getSchools = async (_req: AuthRequest, res: Response) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        _count: { select: { users: true, classes: true } },
        settings: { select: { name: true, logoUrl: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(schools);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const getSchoolById = async (req: AuthRequest, res: Response) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        settings: true,
        _count: { select: { users: true, classes: true } },
      },
    });
    if (!school) { res.status(404).json({ message: "School not found" }); return; }
    res.json(school);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const createSchool = async (req: AuthRequest, res: Response) => {
  try {
    const { name, slug, superAdminEmail, superAdminFirstName, superAdminLastName, superAdminPassword } = req.body;

    const existing = await prisma.school.findUnique({ where: { slug } });
    if (existing) { res.status(400).json({ message: "A school with this slug already exists" }); return; }

    // Create school + settings + super admin in one transaction
    const school = await prisma.school.create({ data: { name, slug } });

    // Create default settings for this school
    await prisma.schoolSettings.create({
      data: {
        schoolId: school.id,
        name,
        studentFormFields: JSON.stringify(DEFAULT_STUDENT_FIELDS),
        teacherFormFields: JSON.stringify(DEFAULT_TEACHER_FIELDS),
        customSections: JSON.stringify([]),
      },
    });

    // Create super admin for this school
    const hashed = await bcrypt.hash(superAdminPassword, 12);
    const superAdmin = await prisma.user.create({
      data: {
        email: superAdminEmail,
        password: hashed,
        firstName: superAdminFirstName,
        lastName: superAdminLastName,
        role: "SUPER_ADMIN",
        schoolId: school.id,
        admin: { create: {} },
      },
    });

    res.status(201).json({ school, superAdmin: { id: superAdmin.id, email: superAdmin.email } });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const updateSchool = async (req: AuthRequest, res: Response) => {
  try {
    const school = await prisma.school.update({
      where: { id: Number(req.params.id) },
      data: { name: req.body.name, slug: req.body.slug },
    });
    res.json(school);
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

export const deleteSchool = async (req: AuthRequest, res: Response) => {
  try {
    await prisma.school.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: "School deleted" });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};

// Switch active school context (for OWNER)
export const switchSchool = async (req: AuthRequest, res: Response) => {
  try {
    const { schoolId } = req.body;
    if (req.user?.role !== "OWNER") { res.status(403).json({ message: "Only the owner can switch schools" }); return; }
    const school = await prisma.school.findUnique({ where: { id: Number(schoolId) } });
    if (!school) { res.status(404).json({ message: "School not found" }); return; }
    res.json({ schoolId: school.id, schoolName: school.name });
  } catch (err) { res.status(500).json({ message: "Server error", error: err }); }
};
