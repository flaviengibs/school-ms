import prisma from "./utils/prisma";
import bcrypt from "bcryptjs";
import { DEFAULT_STUDENT_FIELDS, DEFAULT_TEACHER_FIELDS } from "./utils/formDefaults";

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // Platform owner (no school)
  await prisma.user.upsert({
    where: { email: "owner@schoolms.gibbons.fr" },
    update: {},
    create: {
      email: "owner@schoolms.gibbons.fr",
      password: await hash("Owner1234!"),
      firstName: "Platform",
      lastName: "Owner",
      role: "OWNER",
      schoolId: null,
    },
  });

  // Default school
  const school = await prisma.school.upsert({
    where: { slug: "x-paris" },
    update: {},
    create: { name: "Polytechnique Paris", slug: "x-paris" },
  });

  // School settings
  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      name: "Polytechnique Paris",
      studentFormFields: JSON.stringify(DEFAULT_STUDENT_FIELDS),
      teacherFormFields: JSON.stringify(DEFAULT_TEACHER_FIELDS),
      customSections: JSON.stringify([]),
    },
  });

  // Super admin for this school
  await prisma.user.upsert({
    where: { email: "superadmin@schoolms.gibbons.fr" },
    update: {},
    create: {
      email: "superadmin@schoolms.gibbons.fr",
      password: await hash("Admin1234!"),
      firstName: "Super",
      lastName: "Admin",
      role: "SUPER_ADMIN",
      schoolId: school.id,
      admin: { create: {} },
    },
  });

  // Admin
  await prisma.user.upsert({
    where: { email: "admin@schoolms.gibbons.fr" },
    update: {},
    create: {
      email: "admin@schoolms.gibbons.fr",
      password: await hash("Admin1234!"),
      firstName: "School",
      lastName: "Admin",
      role: "ADMIN",
      schoolId: school.id,
      admin: { create: {} },
    },
  });

  // Teacher
  const teacherUser = await prisma.user.upsert({
    where: { email: "teacher@schoolms.gibbons.fr" },
    update: {},
    create: {
      email: "teacher@schoolms.gibbons.fr",
      password: await hash("Teacher1234!"),
      firstName: "John",
      lastName: "Doe",
      role: "TEACHER",
      schoolId: school.id,
      teacher: { create: {} },
    },
  });
  const teacher = await prisma.teacher.findUnique({ where: { userId: teacherUser.id } });

  // Subjects
  const math = await prisma.subject.upsert({
    where: { code_schoolId: { code: "MATH6A", schoolId: school.id } },
    update: {},
    create: { name: "Mathématiques", code: "MATH6A", coefficient: 4, teacherId: teacher!.id, schoolId: school.id },
  });
  const physics = await prisma.subject.upsert({
    where: { code_schoolId: { code: "PHY6A", schoolId: school.id } },
    update: {},
    create: { name: "Physique", code: "PHY6A", coefficient: 2, teacherId: teacher!.id, schoolId: school.id },
  });

  // Class
  const cls = await prisma.class.upsert({
    where: { name_schoolId: { name: "6ème A", schoolId: school.id } },
    update: {},
    create: { name: "6ème A", level: "6ème", year: "2025-2026", schoolId: school.id },
  });

  // Student
  const studentUser = await prisma.user.upsert({
    where: { email: "student@schoolms.gibbons.fr" },
    update: {},
    create: {
      email: "student@schoolms.gibbons.fr",
      password: await hash("Student1234!"),
      firstName: "Alice",
      lastName: "Martin",
      role: "STUDENT",
      schoolId: school.id,
      student: { create: { studentCode: "STU0001", classId: cls.id } },
    },
  });
  const student = await prisma.student.findUnique({ where: { userId: studentUser.id } });

  // Parent
  const parentUser = await prisma.user.upsert({
    where: { email: "parent@schoolms.gibbons.fr" },
    update: {},
    create: {
      email: "parent@schoolms.gibbons.fr",
      password: await hash("Parent1234!"),
      firstName: "Marie",
      lastName: "Martin",
      role: "PARENT",
      schoolId: school.id,
      parent: { create: {} },
    },
  });
  const parent = await prisma.parent.findUnique({ where: { userId: parentUser.id } });
  if (student && parent) {
    await prisma.student.update({ where: { id: student.id }, data: { parentId: parent.id } });
  }

  // Timetable entries
  for (const entry of [
    { classId: cls.id, subjectId: math.id, teacherId: teacher!.id, day: "MONDAY", startTime: "08:00", endTime: "09:00", room: "Salle 101" },
    { classId: cls.id, subjectId: physics.id, teacherId: teacher!.id, day: "WEDNESDAY", startTime: "10:00", endTime: "11:00", room: "Salle 102" },
  ]) { await prisma.timetable.create({ data: entry }).catch(() => {}); }

  // Grades
  for (const grade of [
    { studentId: student!.id, subjectId: math.id, teacherId: teacher!.id, value: 16.5, maxValue: 20, period: "Trimestre 1", comment: "Très bon travail" },
    { studentId: student!.id, subjectId: physics.id, teacherId: teacher!.id, value: 19, maxValue: 20, period: "Trimestre 1", comment: "Excellent" },
  ]) { await prisma.grade.create({ data: grade }).catch(() => {}); }

  console.log("Seed done.");
  console.log("Owner:       owner@schoolms.gibbons.fr / Owner1234!");
  console.log("Super admin: superadmin@schoolms.gibbons.fr / Admin1234!");
  console.log("Admin:       admin@schoolms.gibbons.fr / Admin1234!");
  console.log("Teacher:     teacher@schoolms.gibbons.fr / Teacher1234!");
  console.log("Student:     student@schoolms.gibbons.fr / Student1234!");
  console.log("Parent:      parent@schoolms.gibbons.fr / Parent1234!");
}

// Called on server startup — safe to run on every deploy (all upserts)
export async function runSeed() {
  try {
    await main();
  } catch (err) {
    console.error("Seed error:", err);
  }
}

// Allow direct execution: ts-node src/seed.ts
if (require.main === module) {
  main().catch(console.error).finally(() => prisma.$disconnect());
}
