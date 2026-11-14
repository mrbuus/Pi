-- Хугацаатай давталтын эх сурвалж (хариу нээх хаалганд). Зөвхөн nullable багана нэмнэ.
ALTER TABLE "ProblemReview" ADD COLUMN IF NOT EXISTS "sourceTestId" TEXT;
ALTER TABLE "ProblemReview" ADD COLUMN IF NOT EXISTS "sourceRefId" TEXT;
