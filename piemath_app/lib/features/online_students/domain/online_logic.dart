import '../../../core/auth/user_role.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../data/online_models.dart';

/// Онлайн сурагчдын эрх — вэб (`app/online/layout.tsx`), сервертэй (`progress.service.ts`) ИЖИЛ.
///
/// | Үйлдэл | Админ | Багш+ | Багш |
/// |---|---|---|---|
/// | Жагсаалт, дэлгэрэнгүй, идэвх харах | тийм | тийм | тийм (зөвхөн харна) |
/// | Тест оноох, оролдлогын тэмдэглэгээ засах | тийм | тийм | үгүй |
///
/// Онлайн сурагч ангигүй тул Багшийн «өөрийн анги» хязгаар энд байхгүй (сервертэй ижил).
class OnlineAccess {
  const OnlineAccess(this.role);

  final UserRole? role;

  bool get canView => role?.isStaff ?? false;

  bool get canEdit => role == UserRole.admin || role == UserRole.teacherPlus;
}

// ───────── Шүүлтүүр (нэг мөр чип → серверийн query) ─────────

abstract final class OnlineFilters {
  /// Эрх хүчинтэй хэрнээ идэвхгүй — эргэж холбогдох.
  static const attention = 'attention';
  static const active = 'active';
  static const slowing = 'slowing';
  static const dormant = 'dormant';
  static const withPass = 'with-pass';
  static const noPass = 'no-pass';

  /// Чипийн id → `(passStatus, activity)`.
  static ({String? passStatus, String? activity}) query(String? id) => switch (id) {
    attention => (passStatus: 'ACTIVE', activity: 'DORMANT'),
    active => (passStatus: null, activity: 'ACTIVE'),
    slowing => (passStatus: null, activity: 'SLOWING'),
    dormant => (passStatus: null, activity: 'DORMANT'),
    withPass => (passStatus: 'ACTIVE', activity: null),
    noPass => (passStatus: 'EXPIRED', activity: null),
    _ => (passStatus: null, activity: null),
  };
}

/// Сервер аль хэдийн `dormant_with_pass`-аар эрэмбэлдэг; хуудас дотор давхар баталгаажуулна (вэбийн `sortRoster`).
List<OnlineStudent> priorityFirst(List<OnlineStudent> list) => [
  ...list.where((s) => s.dormantWithPass),
  ...list.where((s) => !s.dormantWithPass),
];

// ───────── Эрх ─────────

enum PassState { none, valid, expiringSoon }

const expiringSoonDays = 7;

/// Үлдсэн хоног (дээш тоймлосон), эрхгүй бол null.
int? passDaysLeft(ActivePass? p, DateTime now) {
  final exp = p?.expiresAt;
  if (exp == null) return null;
  return (exp.difference(now).inMinutes / (24 * 60)).ceil();
}

PassState passState(ActivePass? p, DateTime now) {
  if (p == null) return PassState.none;
  final left = passDaysLeft(p, now);
  return left != null && left <= expiringSoonDays ? PassState.expiringSoon : PassState.valid;
}

// ───────── Идэвх ─────────

const _activeDays = 3;
const _slowingDays = 10;

/// Дэлгэрэнгүйн хариу `lastActiveAt` илгээдэггүй — өдөр тутмын идэвхээс сүүлийн идэвхтэй өдрийг олно (вэбтэй ижил).
UbDateTime? lastActiveDay(List<ActivityDay> days, UbDateTime today) {
  final todayKey = today.dateKey;
  UbDateTime? best;
  for (final d in days) {
    if (d.count <= 0 || d.date.compareTo(todayKey) > 0) continue;
    final day = parseDateKey(d.date);
    if (day != null && (best == null || day.compareTo(best) > 0)) best = day;
  }
  return best;
}

/// Сүүлийн идэвхтэй өдрөөс идэвхийн түвшин (сервертэй ижил босго, өдрийн нарийвчлалтай).
Engagement engagementSince(UbDateTime? lastDay, UbDateTime today) {
  if (lastDay == null) return Engagement.dormant;
  final inactive = today.dayIndex - lastDay.dayIndex;
  if (inactive <= _activeDays) return Engagement.active;
  if (inactive <= _slowingDays) return Engagement.slowing;
  return Engagement.dormant;
}

/// «Дөнгөж сая», «5 минутын өмнө», «3 өдрийн өмнө», «2 сарын өмнө» (вэбийн `formatRelative`).
String relativeSince(DateTime? at, DateTime now) {
  if (at == null) return 'Хэзээ ч идэвхжиж байгаагүй';
  final min = now.difference(at).inMinutes;
  if (min < 1) return 'Дөнгөж сая';
  if (min < 60) return '$min минутын өмнө';
  final hours = min ~/ 60;
  if (hours < 24) return '$hours цагийн өмнө';
  final days = hours ~/ 24;
  if (days < 30) return '$days өдрийн өмнө';
  final months = days ~/ 30;
  if (months < 12) return '$months сарын өмнө';
  return DateMn.numeric(UbDateTime.fromInstant(at));
}

/// Өдрөөр: «Өнөөдөр», «Өчигдөр», «4 өдрийн өмнө».
String relativeDay(UbDateTime? day, UbDateTime today) {
  if (day == null) return 'Идэвхжиж байгаагүй';
  final d = today.dayIndex - day.dayIndex;
  if (d <= 0) return 'Өнөөдөр';
  if (d == 1) return 'Өчигдөр';
  if (d < 30) return '$d өдрийн өмнө';
  return DateMn.numeric(day);
}

/// Сүүлийн [weeks] долоо хоногийн идэвх: багана бүр Даваа–Ням (0–4 түвшин, ирээдүйн өдөр = -1).
List<List<int>> activityWeeks(List<ActivityDay> days, UbDateTime today, {int weeks = 12}) {
  final level = {for (final d in days) d.date: d.level};
  final monday = today.startOfDay.addDays(1 - today.weekday);
  final start = monday.addDays(-7 * (weeks - 1));
  return [
    for (var w = 0; w < weeks; w++)
      [
        for (var d = 0; d < 7; d++)
          () {
            final day = start.addDays(w * 7 + d);
            if (day.dayIndex > today.dayIndex) return -1;
            return level[day.dateKey] ?? 0;
          }(),
      ],
  ];
}

// ───────── Шошго ─────────

const selfStateOptions = <(String, String)>[
  ('SOLVED_CLEAN', 'Алдаагүй'),
  ('FIXED_AFTER_ERROR', 'Зассан'),
  ('FAILED', 'Алдсан'),
  ('GUESSED', 'Буудсан'),
];

String selfStateLabel(String? s) {
  if (s == null) return 'Тэмдэглэгээгүй';
  for (final (v, l) in selfStateOptions) {
    if (v == s) return l;
  }
  return 'Бусад';
}

String attemptSourceLabel(String s) => switch (s) {
  'EVENING_SELF_REPORT' => 'Оройн тэмдэглэгээ',
  'ONLINE_TEST' => 'Онлайн тест',
  'CHAPTER_EXAM' => 'Бүлгийн шалгалт',
  'OMR_IMPORT' => 'Хариултын хуудас',
  _ => 'Бусад',
};

String testTypeLabel(String t) => switch (t) {
  'DAILY' => 'Өдөр тутмын тест',
  'CHAPTER_EXAM' => 'Бүлгийн шалгалт',
  'EESH_MOCK' => 'ЭЕШ сорил',
  'THEORY' => 'Онолын тест',
  _ => 'Бусад тест',
};

String eventLabel(String type) => switch (type) {
  'LOGIN' => 'Нэвтэрсэн',
  'LOGOUT' => 'Гарсан',
  'SEARCH' => 'Хайлт хийсэн',
  'CHAPTER_OPENED' => 'Бүлэг нээсэн',
  'VIDEO_STARTED' => 'Бичлэг эхэлсэн',
  'VIDEO_COMPLETED' => 'Бичлэг дуусгасан',
  'PROBLEM_OPENED' => 'Бодлого нээсэн',
  'ANSWER_SUBMITTED' => 'Хариулт илгээсэн',
  'HINT_USED' => 'Тусламж авсан',
  'RETRY' => 'Дахин оролдсон',
  'BOOKMARK' => 'Хадгалсан',
  'TEST_STARTED' => 'Тест эхэлсэн',
  'TEST_FINISHED' => 'Тест дуусгасан',
  'EVENING_MARK' => 'Оройн тэмдэглэгээ',
  'PAGE_VIEW' => 'Хуудас үзсэн',
  _ => 'Үйлдэл',
};

/// Хугацааны мөрийн бичвэр: «Бүлэг нээсэн, 3 мин», «Тэгшитгэл, Алдаагүй».
String timelineText(TimelineItem item) => switch (item) {
  final TimelineAttempt a => '${a.chapterTitle}, ${selfStateLabel(a.selfState)}',
  final TimelineEvent e => '${eventLabel(e.type)}${_duration(e.durationMs)}',
};

String _duration(int? ms) {
  if (ms == null || ms <= 1000) return '';
  final min = (ms / 60000).round();
  return min > 0 ? ', $min мин' : ', ${(ms / 1000).round()} сек';
}

/// Хугацааны тэнхлэгийг өдрөөр бүлэглэнэ (шинэ нь эхэнд).
List<({UbDateTime day, List<TimelineItem> items})> groupByDay(List<TimelineItem> items) {
  final out = <({UbDateTime day, List<TimelineItem> items})>[];
  for (final i in items) {
    final day = UbDateTime.fromInstant(i.at).startOfDay;
    if (out.isNotEmpty && out.last.day == day) {
      out.last.items.add(i);
    } else {
      out.add((day: day, items: [i]));
    }
  }
  return out;
}
