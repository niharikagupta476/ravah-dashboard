PRAGMA foreign_keys=OFF;

DROP INDEX IF EXISTS "User_githubId_key";

CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_User" ("id", "name", "email", "image", "createdAt")
SELECT "id", "name", "email", "avatarUrl", "createdAt"
FROM "User";

DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
