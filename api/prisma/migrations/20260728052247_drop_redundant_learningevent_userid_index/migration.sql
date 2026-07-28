-- PERF-AUDIT.md §0 олдвор #8: "LearningEvent_userId_idx" нь доорх
-- "LearningEvent_userId_occurredAt_idx" composite индексийн prefix-ээр аль
-- хэдийн бүрхэгдсэн (WHERE userId = ... query-д ялгаагүй ашиглагдана — dev DB
-- дээр EXPLAIN-ээр баталгаажуулав: индексийг устгасны дараа ч гэсэн
-- "WHERE userId = ?" болон "WHERE userId = ? AND occurredAt > ?" хоёулаа Index
-- Scan хэвээр, LearningEvent_userId_occurredAt_idx-ийг ашигласан). Зөвхөн
-- бичихэд илүүдэл overhead өгдөг байсан тул хасав — унших талд ЯМАР Ч
-- регресс алга.
-- DropIndex
DROP INDEX "LearningEvent_userId_idx";
