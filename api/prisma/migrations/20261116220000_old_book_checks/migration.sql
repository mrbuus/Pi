-- Номын мөнгө нэвтрэхээс (2026-11-12) өмнө энгийн чекээр нээсэн «E2» маягийн номын чекийг номын чек
-- болгоно (эзэн 2026-11-16: «хэн авсан / хэний дансанд» тэмдэглэх боломжгүй байсан).
-- ЗӨВХӨН НЭМЭХ: ClassCheckMark мөрүүд хэвээр үлдэнэ; тэмдэглэсэн сурагч бүрд BookPayment (PAID,
-- чекийн дүн, тэр анги, авсан багш = тэмдэглэсэн хүн, цаг = тэмдэглэсэн цаг) үүснэ. Багш «⋯»-ээр засна.
-- Нөхцөл: гарчиг E1/E2/E3 (зай, зураасгүйгээр), тэр ангид тэр номын чек байхгүй, сурагчид тэр номын
-- идэвхтэй төлбөр байхгүй. Дахин ажиллуулахад юу ч давхардахгүй.

CREATE TEMP TABLE _old_book_checks AS
SELECT c.id, c."classroomId", c.amount,
       upper(regexp_replace(c.title, '[\s\-]', '', 'g')) AS key
FROM "ClassCheck" c
WHERE c."bookKey" IS NULL
  AND c."deletedAt" IS NULL
  AND upper(regexp_replace(c.title, '[\s\-]', '', 'g')) IN ('E1', 'E2', 'E3')
  AND NOT EXISTS (
    SELECT 1 FROM "ClassCheck" o
    WHERE o."classroomId" = c."classroomId" AND o."deletedAt" IS NULL
      AND o."bookKey" = upper(regexp_replace(c.title, '[\s\-]', '', 'g'))
  );

-- Нэг ангид ижил гарчигтай хоёр хуучин чек байвал хамгийн олон тэмдэглэгээтэйг нь л авна
DELETE FROM _old_book_checks t
WHERE EXISTS (
  SELECT 1 FROM _old_book_checks t2
  WHERE t2."classroomId" = t."classroomId" AND t2.key = t.key AND t2.id <> t.id
    AND ((SELECT count(*) FROM "ClassCheckMark" m WHERE m."checkId" = t2.id AND m.checked),
         t2.id)
      > ((SELECT count(*) FROM "ClassCheckMark" m WHERE m."checkId" = t.id AND m.checked),
         t.id)
);

INSERT INTO "BookPayment" ("id", "studentId", "bookKey", "status", "amount", "classroomId", "checkId",
                           "collectedById", "createdById", "createdAt")
SELECT DISTINCT ON (m."studentId", t.key)
       'bpmig' || md5(m.id), m."studentId", t.key, 'PAID', t.amount, t."classroomId", t.id,
       m."updatedById", m."updatedById", m."updatedAt"
FROM _old_book_checks t
JOIN "ClassCheckMark" m ON m."checkId" = t.id AND m.checked
WHERE NOT EXISTS (
  SELECT 1 FROM "BookPayment" bp
  WHERE bp."studentId" = m."studentId" AND bp."bookKey" = t.key AND bp."voidedAt" IS NULL
)
ORDER BY m."studentId", t.key, m."updatedAt";

UPDATE "ClassCheck" c SET "bookKey" = t.key
FROM _old_book_checks t
WHERE c.id = t.id;

DROP TABLE _old_book_checks;
