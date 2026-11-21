-- Хоцорч ирсэн хариу (tests/late-answers.ts) — зөвхөн нэмэх, NULL = хоцорсон хариугүй (өмнөх зан төлөв)
ALTER TABLE "TestAttemptSession" ADD COLUMN IF NOT EXISTS "lateAnswers" JSONB NULL;
ALTER TABLE "TestAttemptSession" ADD COLUMN IF NOT EXISTS "lateReceivedAt" TIMESTAMP(3) NULL;
