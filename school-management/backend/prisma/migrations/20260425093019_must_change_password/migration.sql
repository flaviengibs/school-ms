-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STUDENT',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "blameCount" INTEGER NOT NULL DEFAULT 0,
    "crossCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "suspendUntil" DATETIME,
    "blameReason" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "schoolId" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("blameCount", "blameReason", "createdAt", "crossCount", "email", "firstName", "id", "lastName", "password", "phone", "role", "schoolId", "status", "suspendUntil", "updatedAt", "warningCount") SELECT "blameCount", "blameReason", "createdAt", "crossCount", "email", "firstName", "id", "lastName", "password", "phone", "role", "schoolId", "status", "suspendUntil", "updatedAt", "warningCount" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
