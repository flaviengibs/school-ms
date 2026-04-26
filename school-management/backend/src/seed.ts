import prisma from "./utils/prisma";
import bcrypt from "bcryptjs";
import { DEFAULT_STUDENT_FIELDS, DEFAULT_TEACHER_FIELDS } from "./utils/formDefaults";

async function main() {
  const hash = (p: string) => bcrypt.hash(p, 10);

  // Platform owner (no school)
  await prisma.user.upsert({
    where: { email: "owner@flaviengibs.github.io" },
    update: {},
    create: {
      email: "owner@flaviengibs.github.io",
      password: await hash("Owner1234!"),
      firstName: "Platform",
      lastName: "Owner",
      role: "OWNER",
      schoolId: null,
    },
  });

  // Default school
  const school = await prisma.school.upsert({
    where: { slug: "notre-dame" },
    update: {},
    create: { name: "Notre-Dame Les Oiseaux", slug: "notre-dame" },
  });

  // School settings
  await prisma.schoolSettings.upsert({
    where: { schoolId: school.id },
    update: {},
    create: {
      schoolId: school.id,
      name: "Notre-Dame Les Oiseaux",
      studentFormFields: JSON.stringify(DEFAULT_STUDENT_FIELDS),
      teacherFormFields: JSON.stringify(DEFAULT_TEACHER_FIELDS),
      customSections: JSON.stringify([]),
    },
  });

  // Super admin for this school
  await prisma.user.upsert({
    where: { email: "superadmin@flaviengibs.github.io" },
    update: {},
    create: {
      email: "superadmin@flaviengibs.github.io",
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
    where: { email: "admin@flaviengibs.github.io" },
    update: {},
    create: {
      email: "admin@flaviengibs.github.io",
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
    where: { email: "teacher@flaviengibs.github.io" },
    update: {},
    create: {
      email: "teacher@flaviengibs.github.io",
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
    where: { email: "student@flaviengibs.github.io" },
    update: {},
    create: {
      email: "student@flaviengibs.github.io",
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
    where: { email: "parent@flaviengibs.github.io" },
    update: {},
    create: {
      email: "parent@flaviengibs.github.io",
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
  console.log("Owner:       owner@flaviengibs.github.io / Owner1234!");
  console.log("Super admin: superadmin@flaviengibs.github.io / Admin1234!");
  console.log("Admin:       admin@flaviengibs.github.io / Admin1234!");
  console.log("Teacher:     teacher@flaviengibs.github.io / Teacher1234!");
  console.log("Student:     student@flaviengibs.github.io / Student1234!");
  console.log("Parent:      parent@flaviengibs.github.io / Parent1234!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
