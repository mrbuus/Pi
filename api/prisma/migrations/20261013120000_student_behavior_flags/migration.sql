-- «Анги» самбар: сурагчийн зан төлөвийн шошго (зөвхөн НЭМЭХ, түүх хадгална)
CREATE TABLE IF NOT EXISTS "StudentBehaviorFlag" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT,
    "kind" VARCHAR(40) NOT NULL,
    "note" VARCHAR(300),
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "removedById" TEXT,
    "removedByName" TEXT,
    "removeNote" VARCHAR(300),
    CONSTRAINT "StudentBehaviorFlag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentBehaviorFlag_studentId_removedAt_idx" ON "StudentBehaviorFlag"("studentId", "removedAt");
CREATE INDEX IF NOT EXISTS "StudentBehaviorFlag_classroomId_removedAt_idx" ON "StudentBehaviorFlag"("classroomId", "removedAt");
