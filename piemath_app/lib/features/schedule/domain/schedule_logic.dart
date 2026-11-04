import '../../../core/format/person_name.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../data/schedule_models.dart';

// Хуваарийн цэвэр логик. Гарагийн хөрвүүлэлт ЗӨВХӨН `core/time/weekday.dart`-аар.

/// Тухайн өдрийн 7 хоногийн Даваа гараг (УБ).
UbDateTime mondayOf(UbDateTime day) => day.startOfDay.addDays(-(day.weekday - 1));

/// Тогтмол хэв маягийг Монгол гарагаар (1=Даваа … 7=Ням) бүлэглэнэ, цагаар эрэмбэлсэн.
/// Буруу (0–6-аас гадуурх) гарагтай мөрийг алгасна.
Map<int, List<ScheduleEntry>> patternByWeekday(List<ScheduleEntry> entries) {
  final out = {for (var d = 1; d <= 7; d++) d: <ScheduleEntry>[]};
  for (final e in entries) {
    if (e.weekday < 0 || e.weekday > 6) continue;
    out[mnWeekdayFromJs(e.weekday)]!.add(e);
  }
  for (final list in out.values) {
    list.sort((a, b) => a.startMinute.compareTo(b.startMinute));
  }
  return out;
}

/// Онцгой өдрийн төрөл (вэбийн `CALENDAR_TYPE_LABEL`).
String calendarTypeLabel(String type) => switch (type) {
      'HOLIDAY' => 'Амралтын өдөр',
      'BREAK' => 'Завсарлага',
      'EXAM_DAY' => 'Шалгалтын өдөр',
      'SPECIAL' => 'Тусгай өдөр',
      'NO_CLASS' => 'Хичээлгүй өдөр',
      _ => 'Онцгой өдөр',
    };

/// Хичээлийн чиглэл (вэбийн `SUBJECT_LABEL`).
String? subjectLabel(String? subject) => switch (subject) {
      'MATH' => 'Математик',
      'SOCIAL_STUDIES' => 'Нийгмийн ухаан',
      'SAT' => 'SAT',
      _ => null,
    };

/// Тогтмол хуваарийн багшийн нэр: «Б. Нэр», Багш+ бол «+».
String? patternTeacherName(SchedulePerson? t) =>
    t == null ? null : staffName(firstName: t.firstName, lastName: t.lastName, role: t.role);

/// 7 хоногийн хуваарийн багшийн нэр (сервер бүтэн «Овог Нэр» өгдөг) + Багш+ «+».
String? weekTeacherName(WeekEntry e) {
  final n = e.teacherName?.trim();
  if (n == null || n.isEmpty) return null;
  return withPlus(n, e.teacherRole);
}

/// Өдрийг Монгол гарагаар (JS → Монгол хөрвүүлэлт).
int mnWeekdayOfDay(WeekDay d) => mnWeekdayFromJs(d.weekday);
