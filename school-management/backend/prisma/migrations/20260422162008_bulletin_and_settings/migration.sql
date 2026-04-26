-- AlterTable
ALTER TABLE "Bulletin" ADD COLUMN "classAverage" REAL;
ALTER TABLE "Bulletin" ADD COLUMN "classSize" INTEGER;
ALTER TABLE "Bulletin" ADD COLUMN "subjectData" TEXT;

-- CreateTable
CREATE TABLE "SchoolSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL DEFAULT 'My school',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "logoUrl" TEXT,
    "principalName" TEXT,
    "updatedAt" DATETIME NOT NULL
);
