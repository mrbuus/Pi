import 'dart:math' as math;

import '../../../core/time/ub_time.dart';

/// Өдрийн хуваарийг нээхэд хаана гүйлгэх вэ (эзэн: 15:00-ийн хичээл дэлгэцээс гадуур үлдэж байсан).
///
/// - Өнөөдөр, яг одоо хичээл явж байвал → «одоо» шугам (30 минутын өмнөөс).
/// - Бусад үед → өдрийн ЭХНИЙ хичээл (20 минутын өмнөөс).
/// - Хичээлгүй бол өнөөдөр «одоо», бусад өдөр торны эхлэл.
///
/// [lessons] нь өдрийн эхнээс хэдэн минут (`startMinute`, `endMinute`). Буцаах нь өдрийн минут.
int agendaTargetMinute({
  required UbDateTime day,
  required UbDateTime now,
  required List<({int start, int end})> lessons,
  int startHour = 8,
}) {
  final today = day.isSameDay(now);
  final nowMinute = now.hour * 60 + now.minute;
  if (today && lessons.any((l) => l.start <= nowMinute && nowMinute < l.end)) return nowMinute - 30;
  if (lessons.isNotEmpty) return lessons.map((l) => l.start).reduce(math.min) - 20;
  return today ? nowMinute - 30 : startHour * 60;
}

/// [agendaTargetMinute]-ийг `DayAgenda`-ийн гүйлгэх зай болгоно. `DayAgenda`-ийн торны эхлэл нь
/// `min(startHour, эхний хичээлийн цаг)` (хүрээнээс гадуурх хичээлд тэлдэг) — түүнтэй ижлээр тооцно.
double agendaScrollOffset({
  required UbDateTime day,
  required UbDateTime now,
  required List<({int start, int end})> lessons,
  int startHour = 8,
  double hourHeight = 72,
}) {
  var lo = startHour;
  for (final l in lessons) {
    lo = math.min(lo, l.start ~/ 60);
  }
  lo = lo.clamp(0, 23);
  final target = agendaTargetMinute(day: day, now: now, lessons: lessons, startHour: startHour);
  return math.max(0, (target - lo * 60) * hourHeight / 60);
}
