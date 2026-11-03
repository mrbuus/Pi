-- Нөхөх хичээл: сурагчид тусгайлан нээсэн тест (зөвхөн шинэ хүснэгт, өгөгдөлд хүрэхгүй)
CREATE TABLE "StudentTestAccess" (
    "testId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MAKEUP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentTestAccess_pkey" PRIMARY KEY ("testId","studentId")
);

CREATE INDEX "StudentTestAccess_studentId_idx" ON "StudentTestAccess"("studentId");
