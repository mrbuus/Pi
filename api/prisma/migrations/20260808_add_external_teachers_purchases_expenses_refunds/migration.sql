-- ============ 1. Гадны багш (ExternalTeacherProfile) ============

CREATE TABLE IF NOT EXISTS "ExternalTeacherProfile" (
    "userId" TEXT NOT NULL PRIMARY KEY,
    "organization" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "note" TEXT,
    CONSTRAINT "ExternalTeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ExternalTeacherProfile_verifiedAt_idx" ON "ExternalTeacherProfile" ("verifiedAt");

-- ============ 2. Гадны багшийн анги (TeacherGroup, TeacherGroupMember) ============

CREATE TABLE IF NOT EXISTS "TeacherGroup" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "joinCode" TEXT NOT NULL UNIQUE,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeacherGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "TeacherGroup_ownerId_archived_idx" ON "TeacherGroup" ("ownerId", "archived");

CREATE TABLE IF NOT EXISTS "TeacherGroupMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    CONSTRAINT "TeacherGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TeacherGroup" ("id") ON DELETE CASCADE,
    CONSTRAINT "TeacherGroupMember_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "TeacherGroupMember_groupId_studentId_key" UNIQUE ("groupId", "studentId")
);

CREATE INDEX IF NOT EXISTS "TeacherGroupMember_studentId_idx" ON "TeacherGroupMember" ("studentId");

-- ============ 3. Нэг удаагийн худалдан авалт (ProductItem, Purchase) ============

CREATE TABLE IF NOT EXISTS "ProductItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "ProductItem_kind_refId_key" UNIQUE ("kind", "refId")
);

CREATE INDEX IF NOT EXISTS "ProductItem_active_idx" ON "ProductItem" ("active");

CREATE TABLE IF NOT EXISTS "Purchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productItemId" TEXT NOT NULL,
    "paymentId" TEXT,
    "price" INTEGER NOT NULL,
    "grantedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "Purchase_productItemId_fkey" FOREIGN KEY ("productItemId") REFERENCES "ProductItem" ("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "Purchase_userId_productItemId_idx" ON "Purchase" ("userId", "productItemId");
CREATE INDEX IF NOT EXISTS "Purchase_userId_expiresAt_idx" ON "Purchase" ("userId", "expiresAt");

-- ============ 4. Орлого/зарлага (ExpenseRecord) ============

CREATE TABLE IF NOT EXISTS "ExpenseRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "occurredOn" DATE NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id")
);

CREATE INDEX IF NOT EXISTS "ExpenseRecord_occurredOn_idx" ON "ExpenseRecord" ("occurredOn");
CREATE INDEX IF NOT EXISTS "ExpenseRecord_category_idx" ON "ExpenseRecord" ("category");
CREATE INDEX IF NOT EXISTS "ExpenseRecord_createdAt_idx" ON "ExpenseRecord" ("createdAt");

-- ============ 5. Төлбөрийн буцаалт (TuitionRefund) ============

CREATE TABLE IF NOT EXISTS "TuitionRefund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "leftOn" DATE NOT NULL,
    "totalLessonDays" INTEGER NOT NULL,
    "attendedLessonDays" INTEGER NOT NULL,
    "dailyRate" INTEGER NOT NULL,
    "totalPaid" INTEGER NOT NULL,
    "owed" INTEGER NOT NULL,
    "refundAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    CONSTRAINT "TuitionRefund_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE CASCADE,
    CONSTRAINT "TuitionRefund_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom" ("id") ON DELETE CASCADE,
    CONSTRAINT "TuitionRefund_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id"),
    CONSTRAINT "TuitionRefund_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id")
);

CREATE INDEX IF NOT EXISTS "TuitionRefund_studentId_idx" ON "TuitionRefund" ("studentId");
CREATE INDEX IF NOT EXISTS "TuitionRefund_status_idx" ON "TuitionRefund" ("status");
CREATE INDEX IF NOT EXISTS "TuitionRefund_classroomId_leftOn_idx" ON "TuitionRefund" ("classroomId", "leftOn");
