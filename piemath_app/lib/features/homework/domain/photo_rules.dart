// Сурагчийн илгээх зургийн дүрэм (эзэн 2026-11-12, вэбийн `student-hub/photo-types.ts`; сервер дахин шалгана:
// `api/src/common/photo-edit.ts`, `homework-practice.service.ts`, `lesson-day.service.ts`).

/// Гэрийн даалгаврын дэвтрийн зураг — дээд хуудас (өмнө 6).
const homeworkPhotoMaxPages = 15;

/// Онолын зураг — дээд хуудас (өмнө 10). Нөхөх тэмдэглэлийн зураг 10 хэвээр.
const theoryPhotoMaxPages = 20;

/// Илгээсэн зургаа сурагч өөрөө устгах / солих хугацаа.
const photoEditWindow = Duration(minutes: 5);

/// «Буруу илгээсэн бол 5 минутын дотор устгаж, сольж болно».
const photoEditHint = 'Буруу илгээсэн бол 5 минутын дотор устгаж, сольж болно';

/// Илгээсэн агшнаас 5 минутын дараах агшин; илгээсэн цаг мэдэгдэхгүй бол null (засах боломжгүй).
DateTime? photoEditDeadline(DateTime? sentAt) => sentAt?.add(photoEditWindow);

/// [now] агшинд засах (устгах, солих) боломжтой эсэх.
bool photoEditable(DateTime? sentAt, DateTime now) {
  final until = photoEditDeadline(sentAt);
  return until != null && now.isBefore(until);
}
