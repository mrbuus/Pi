-- Нэг ангид нэг ном / нэг дугаартай хариултын хуудасны ганц (устгаагүй) чек —
-- хоёр багш зэрэг нээхэд давхардахгүй. Энгийн чекэд (bookKey IS NULL) хамаарахгүй.
CREATE UNIQUE INDEX "ClassCheck_classroom_book_key" ON "ClassCheck"("classroomId", "bookKey") WHERE "bookKey" IS NOT NULL AND "deletedAt" IS NULL;
