// Ирц ба даалгаврын самбарын цэвэр логик — вэбийн `TeacherDashboard/board/{useBoard,lib}.ts`-тэй ижил дүрэм.
// Сүлжээ, Riverpod, widget-гүй: зөвхөн өгөгдөл → өгөгдөл (unit тесттэй).
import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';
import '../data/staff_models.dart';
import '../data/teacher_models.dart';

/// Хоёр багш зэрэг тэмдэглэх үед серверээс шинэчлэх давтамж (вэб `POLL_MS`).
const pollInterval = Duration(seconds: 15);

/// Бичиж зогссоноос хойш хадгалах хүлээлт (вэб `TYPE_MS`).
const typingDelay = Duration(milliseconds: 700);

/// Хадгалалт дууссаны дараа «хэн тэмдэглэсэн», эрсдэлийг шинэчлэх хүлээлт (вэб `REFRESH_MS`).
const refreshDelay = Duration(milliseconds: 1500);

/// Тэмдэглэлийн дээд урт (UI; сервер 300).
const noteMax = 200;

/// Вэбийн `NOTE_SUGGESTIONS`. «Өвчтэй» болон өвчний ямар ч сонголт ХОРИОТОЙ (эзний дүрэм) —
/// жагсаалтад нэмэгдсэн ч [absenceReasons] шүүнэ.
const _noteSuggestions = ['тэмцээн', 'олимпиад', 'гэр бүлийн шалтгаан', 'эмнэлэг', 'хичээлийн бус ажил'];

/// Тасалсан шалтгааны чип.
final List<String> absenceReasons = List.unmodifiable(_noteSuggestions.where((s) => !s.contains('өвч')));

/// Чөлөөтэй шалтгааны чип.
final List<String> excusedReasons = List.unmodifiable(['өөр давтлагатай', ...absenceReasons]);

/// Дутуу/хийгээгүй даалгаврын шалтгааны чип.
const homeworkReasons = ['ойлгоогүй', 'дутуу хийсэн', 'өмнөх хичээлдээ суугаагүй'];

/// Хоцорсон хугацааны бүтэн шошго (вэб `LATE_RANGE_LABEL`).
String lateRangeLabel(LateRange r) => switch (r) {
  LateRange.fiveToTen => '5–10 минут',
  LateRange.tenToThirty => '10–30 минут',
  LateRange.thirtyToSixty => '30 минут – 1 цаг',
  LateRange.overOneHour => '1 цагаас дээш',
};

/// Тайлбар нь шалтгааны жагсаалтын нэг утга яг мөн эсэх (төлөв солигдоход цэвэрлэнэ).
bool isReason(String text, List<String> list) => list.contains(text.trim());

/// Ирцийн төлөвт тохирох шалтгааны чип (Ирсэн, Хоцорсонд чип байхгүй).
List<String> reasonsForAttendance(AttendanceStatus? s) => switch (s) {
  AttendanceStatus.absent => absenceReasons,
  AttendanceStatus.excused => excusedReasons,
  _ => const [],
};

/// 900 → «15:00».
String hm(int minute) => '${(minute ~/ 60).toString().padLeft(2, '0')}:${(minute % 60).toString().padLeft(2, '0')}';

/// Нэг сурагчийн тухайн өдрийн бүртгэл (серверийн утга + хадгалагдаж буй түр утга).
@immutable
class DayRec {
  const DayRec({this.att, this.lateRange, this.attNote = '', this.hw, this.hwNote = '', this.attBy, this.hwBy});

  final AttendanceStatus? att;
  final LateRange? lateRange;
  final String attNote;
  final HomeworkStatus? hw;
  final String hwNote;
  final String? attBy;
  final String? hwBy;

  static const empty = DayRec();

  /// Ирсэн эсвэл хоцорсон (даалгавар шалгах боломжтой).
  bool get attended => att == AttendanceStatus.present || att == AttendanceStatus.late;

  bool get hasNote => attNote.trim().isNotEmpty || hwNote.trim().isNotEmpty;

  @override
  bool operator ==(Object other) =>
      other is DayRec &&
      other.att == att &&
      other.lateRange == lateRange &&
      other.attNote == attNote &&
      other.hw == hw &&
      other.hwNote == hwNote &&
      other.attBy == attBy &&
      other.hwBy == hwBy;

  @override
  int get hashCode => Object.hash(att, lateRange, attNote, hw, hwNote, attBy, hwBy);
}

/// Тайлбар шаардлагатай төлөв (⋯ товчийг тодруулна).
bool needsDetail(DayRec r, {required bool homework}) =>
    r.att == AttendanceStatus.late ||
    r.att == AttendanceStatus.absent ||
    r.att == AttendanceStatus.excused ||
    (homework && (r.hw == HomeworkStatus.partial || r.hw == HomeworkStatus.notDone));

/// Самбарын нүд.
enum Cell { att, attNote, hw, hwNote }

String cellKey(String studentId, Cell cell) => '$studentId|${cell.name}';

/// Хадгалагдаж буй (серверээс хариу ирээгүй) нүдний түр утга. Poll-ийн утга үүнийг дарахгүй.
sealed class CellOverride {
  const CellOverride();
  Cell get cell;
}

class AttOverride extends CellOverride {
  const AttOverride(this.att, this.lateRange);
  final AttendanceStatus? att;
  final LateRange? lateRange;
  @override
  Cell get cell => Cell.att;
}

class AttNoteOverride extends CellOverride {
  const AttNoteOverride(this.text);
  final String text;
  @override
  Cell get cell => Cell.attNote;
}

class HwOverride extends CellOverride {
  const HwOverride(this.hw);
  final HomeworkStatus? hw;
  @override
  Cell get cell => Cell.hw;
}

class HwNoteOverride extends CellOverride {
  const HwNoteOverride(this.text);
  final String text;
  @override
  Cell get cell => Cell.hwNote;
}

/// Серверийн сүүлийн мэдэгдэж буй төлөв (сурагчаар).
@immutable
class ServerMarks {
  const ServerMarks({this.att = const {}, this.hw = const {}});

  factory ServerMarks.of({required List<AttRow> attendance, required List<HwRow> homework}) =>
      ServerMarks(att: {for (final r in attendance) r.studentId: r}, hw: {for (final r in homework) r.studentId: r});

  final Map<String, AttRow> att;
  final Map<String, HwRow> hw;

  /// [ids]-ийн мөрийг устгаад [rows]-оор солино (хариуд ирээгүй = тэмдэглэгээ цэвэрлэгдсэн).
  ServerMarks withAtt(Iterable<String> ids, List<AttRow> rows) {
    final next = Map.of(att);
    for (final id in ids) {
      next.remove(id);
    }
    for (final r in rows) {
      next[r.studentId] = r;
    }
    return ServerMarks(att: next, hw: hw);
  }

  ServerMarks withHw(Iterable<String> ids, List<HwRow> rows) {
    final next = Map.of(hw);
    for (final id in ids) {
      next.remove(id);
    }
    for (final r in rows) {
      next[r.studentId] = r;
    }
    return ServerMarks(att: att, hw: next);
  }
}

/// Серверийн утга дээр түр утгыг давхарлана (вэб `recs`/`current`).
DayRec recordFor(String sid, ServerMarks server, Map<String, CellOverride> overrides) {
  final a = server.att[sid];
  final h = server.hw[sid];
  var att = a?.status;
  var lateRange = a?.lateRange;
  var attNote = a?.note ?? '';
  var hw = h?.status;
  var hwNote = h?.comment ?? '';
  final o1 = overrides[cellKey(sid, Cell.att)];
  if (o1 is AttOverride) {
    att = o1.att;
    lateRange = o1.lateRange;
  }
  final o2 = overrides[cellKey(sid, Cell.attNote)];
  if (o2 is AttNoteOverride) attNote = o2.text;
  final o3 = overrides[cellKey(sid, Cell.hw)];
  if (o3 is HwOverride) hw = o3.hw;
  final o4 = overrides[cellKey(sid, Cell.hwNote)];
  if (o4 is HwNoteOverride) hwNote = o4.text;
  return DayRec(
    att: att,
    lateRange: lateRange,
    attNote: attNote,
    hw: hw,
    hwNote: hwNote,
    attBy: a?.markedBy,
    hwBy: h?.markedBy,
  );
}

/// Ирцийн товшилтын төлөвлөгөө: түр утгууд + серверт илгээх мөр.
@immutable
class AttPlan {
  const AttPlan({required this.overrides, required this.entry});
  final List<CellOverride> overrides;
  final Map<String, Object?> entry;
}

/// Ирц солих (вэб `onAtt`): хоцролтын хугацаа зөвхөн LATE-д үлдэнэ; тасалсан/чөлөөтэй биш болбол
/// жагсаалтаас сонгосон шалтгааны чипийг цэвэрлэнэ (гараар бичснийг үлдээнэ); тэмдэглэгээг арилгавал
/// мөр устах тул тэмдэглэл ч хамт арилна.
AttPlan planAttendance(String sid, DayRec cur, AttendanceStatus? v) {
  final lateRange = v == AttendanceStatus.late ? cur.lateRange : null;
  final overrides = <CellOverride>[AttOverride(v, lateRange)];
  final entry = <String, Object?>{'studentId': sid, 'status': v?.api};
  final clearNote = v == null
      ? cur.attNote.isNotEmpty
      : v != AttendanceStatus.absent &&
            v != AttendanceStatus.excused &&
            (isReason(cur.attNote, absenceReasons) || isReason(cur.attNote, excusedReasons));
  if (clearNote) {
    overrides.add(const AttNoteOverride(''));
    if (v != null) entry['note'] = null;
  }
  return AttPlan(overrides: overrides, entry: entry);
}

/// Даалгаврын товшилтын төлөвлөгөө (вэб `onHw`).
@immutable
class HwPlan {
  const HwPlan({required this.overrides, required this.fields});
  final List<CellOverride> overrides;
  final Map<String, Object?> fields;
}

HwPlan planHomework(DayRec cur, HomeworkStatus? v) {
  final overrides = <CellOverride>[HwOverride(v)];
  final fields = <String, Object?>{'status': v?.api};
  if (v != HomeworkStatus.partial && v != HomeworkStatus.notDone && isReason(cur.hwNote, homeworkReasons)) {
    overrides.add(const HwNoteOverride(''));
    fields['comment'] = null;
  }
  return HwPlan(overrides: overrides, fields: fields);
}

/// Хадгалах бичвэр: хоосон бол `null` (цэвэрлэх).
String? noteValue(String text) => text.trim().isEmpty ? null : text;

/// Төлөв бүрийн тоо (Ирсэн ба Хоцорсон ТУСДАА — эзэн 2026-10-22).
@immutable
class StatusCounts {
  const StatusCounts({
    required this.attendance,
    required this.attUnmarked,
    required this.homework,
    required this.hwUnmarked,
  });

  final Map<AttendanceStatus, int> attendance;
  final int attUnmarked;
  final Map<HomeworkStatus, int> homework;
  final int hwUnmarked;
}

StatusCounts dayCounts(Iterable<String> ids, Map<String, DayRec> recs) {
  final att = {for (final s in AttendanceStatus.values) s: 0};
  final hw = {for (final s in HomeworkStatus.values) s: 0};
  var attUn = 0;
  var hwUn = 0;
  for (final id in ids) {
    final r = recs[id] ?? DayRec.empty;
    if (r.att != null) {
      att[r.att!] = att[r.att!]! + 1;
    } else {
      attUn++;
    }
    if (r.hw != null) {
      hw[r.hw!] = hw[r.hw!]! + 1;
    } else {
      hwUn++;
    }
  }
  return StatusCounts(attendance: att, attUnmarked: attUn, homework: hw, hwUnmarked: hwUn);
}

/// «Бүгд ирсэн» — зөвхөн тэмдэглээгүй сурагчид (өөр багшийн тэмдэглэгээг дарахгүй, сервер `onlyIf: UNMARKED`).
List<String> bulkPresentCandidates(Iterable<String> ids, Map<String, DayRec> recs) => [
  for (final id in ids)
    if ((recs[id] ?? DayRec.empty).att == null) id,
];

/// «Бүгд хийсэн» — ирсэн/хоцорсон, даалгавар нь тэмдэглээгүй сурагчид. Шалгалтын оноотой сурагч
/// ([quizScored]) орохгүй — даалгаврыг нь шалгасан (эзэн 2026-11-08).
List<String> bulkDoneCandidates(Iterable<String> ids, Map<String, DayRec> recs, {Set<String> quizScored = const {}}) =>
    [
      for (final id in ids)
        if ((recs[id] ?? DayRec.empty).attended && recs[id]!.hw == null && !quizScored.contains(id)) id,
    ];

/// «Бүгд хийсэн»-д алгасах (ирээгүй, ирц тэмдэглээгүй, даалгавар нь тэмдэглээгүй) сурагчийн тоо.
int bulkDoneSkipped(Iterable<String> ids, Map<String, DayRec> recs, {Set<String> quizScored = const {}}) =>
    ids.where((id) {
      final r = recs[id] ?? DayRec.empty;
      return !r.attended && r.hw == null && !quizScored.contains(id);
    }).length;

/// Даалгавар тэмдэглээгүй ч шалгалтын оноотой сурагчийн тоо — «Тэмдэглээгүй»-ээс хасна (эзэн 2026-11-08).
int quizCoveredUnmarked(Iterable<String> ids, Map<String, DayRec> recs, Set<String> quizScored) =>
    ids.where((id) => (recs[id] ?? DayRec.empty).hw == null && quizScored.contains(id)).length;

/// Одоо явагдаж буй хичээл (тухайн өдөр өнөөдөр бол). [nowMinute] — UB шөнө дундаас хойших минут.
BoardLesson? lessonAt(List<BoardLesson> lessons, int nowMinute) {
  for (final l in lessons) {
    if (nowMinute >= l.startMinute && nowMinute < l.endMinute) return l;
  }
  return null;
}

/// `YYYY-MM` ± [delta] сар (ажилласан цагийн сар солих).
String shiftMonth(String month, int delta) {
  final y = int.parse(month.substring(0, 4));
  final m = int.parse(month.substring(5, 7));
  final idx = y * 12 + (m - 1) + delta;
  return '${idx ~/ 12}-${(idx % 12 + 1).toString().padLeft(2, '0')}';
}

/// 125 минут → «2 цаг 5 мин».
String hoursLabel(int minutes) {
  final h = minutes ~/ 60;
  final m = minutes % 60;
  if (h == 0) return '$m мин';
  return m == 0 ? '$h цаг' : '$h цаг $m мин';
}

// ───────── «Онлайн» гэрийн даалгавар (вэбийн `StudentCard`, `OnlineDetail`) ─────────

/// Даалгаврын мөрийн 4-р хайрцгийн төрөл.
enum OnlineBox {
  /// Онлайн тест алга, илгээсэн ч үгүй — дарахгүй тасархай хайрцаг.
  placeholder,

  /// Дарж болно, оноогүй, илгээгээгүй — тасархай, бүдэг.
  idle,

  /// Дарж болно, оноотой эсвэл даалгавар илгээсэн — брэнд өнгөтэй.
  active,
}

/// Онлайн тест байгаа эсвэл сурагч илгээсэн бол дарж дэлгэрэнгүйг нээнэ (эзэн 2026-11-03).
OnlineBox onlineBox({required bool onlineTests, required bool sent, OnlineCell? cell}) {
  if (!onlineTests && !sent) return OnlineBox.placeholder;
  return cell != null || sent ? OnlineBox.active : OnlineBox.idle;
}

/// Дэлгэц уншигчийн шошго (вэбтэй ижил).
String onlineBoxLabel(String name, {required bool onlineTests, required bool sent, OnlineCell? cell}) {
  if (onlineBox(onlineTests: onlineTests, sent: sent, cell: cell) == OnlineBox.placeholder) {
    return 'Онлайн гэрийн даалгавар алга';
  }
  if (cell != null) return '$name, онлайн гэрийн даалгавар ${cell.text}, дэлгэрэнгүй';
  if (sent) return '$name, илгээсэн даалгавар харах';
  return '$name, онлайнаар бодоогүй, дэлгэрэнгүй';
}

/// 75 мин → «1ц 15м»; 40 сек → «40с»; 125 сек → «2м 5с».
String durationSpan(num sec) {
  final s = sec.round() < 0 ? 0 : sec.round();
  if (s < 60) return '$sс';
  final m = s ~/ 60;
  if (m < 60) return s % 60 == 0 ? '$mм' : '$mм ${s % 60}с';
  return m % 60 == 0 ? '${m ~/ 60}ц' : '${m ~/ 60}ц ${m % 60}м';
}

/// ISO агшин → UB «11.03 14:05» (сар.өдөр цаг:минут). Задрахгүй бол хоосон.
String onlineStamp(String? iso) {
  final at = parseApiInstant(iso);
  if (at == null) return '';
  final t = UbDateTime.fromInstant(at);
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(t.month)}.${two(t.day)} ${two(t.hour)}:${two(t.minute)}';
}

/// `2026-10-28` → «10.28-ны даалгавар».
String? previousLessonLabel(String? date) =>
    date == null || date.length < 10 ? null : '${date.substring(5).replaceFirst('-', '.')}-ны даалгавар';

// ───────── Сурагчийн карт (вэбийн `StudentCard`, `Board`) ─────────

/// Эрсдэлийн шалтгаанууд нэг мөрөөр («5 удаа хоцорсон, …»); байхгүй бол хоосон.
String riskText(List<RiskFlag>? flags) => flags == null ? '' : flags.map((f) => f.label).join(', ');

/// Даалгавраа илгээсэн ч багш одоохондоо тэмдэглээгүй (эзэн 2026-11-03) — карт өөр өнгөөр тодорно.
/// Шалгалтын оноотой бол даалгаврыг шалгасанд тооцно (эзэн 2026-11-08).
bool awaitingCheck(DayRec r, {required bool homework, required bool sent, bool quizScored = false}) =>
    homework && sent && r.hw == null && !quizScored;

/// Хаалттай картын тэмдэглэлийн товч: ирцийн ба даалгаврын тэмдэглэл таслалаар.
String notePreview(DayRec r, {required bool homework}) =>
    [r.attNote.trim(), if (homework) r.hwNote.trim()].where((t) => t.isNotEmpty).join(', ');

/// Нөхөх хичээлийн төлөв зөвхөн тасалсан, чөлөөтэй, хоцорсон сурагчид.
bool showsMakeup(DayRec r) =>
    r.att == AttendanceStatus.absent || r.att == AttendanceStatus.excused || r.att == AttendanceStatus.late;

/// Нөхөх хичээлийн төлөвийн шошго (вэб `MAKEUP_LABEL`).
String makeupLabel(MakeupStatus s) => switch (s) {
  MakeupStatus.pending => 'Нөхөөгүй',
  MakeupStatus.partial => 'Хагас нөхсөн',
  MakeupStatus.done => 'Нөхсөн',
  MakeupStatus.waived => 'Чөлөөлсөн',
};

/// Хичээл хараахан эхлээгүй (ирээдүйн өдөр, эсвэл өнөөдөр эхний хичээлээс өмнө).
bool lessonUpcoming(String date, String today, int nowMinute, List<BoardLesson> lessons) {
  if (date.compareTo(today) > 0) return true;
  if (date != today || lessons.isEmpty) return false;
  return nowMinute < lessons.map((l) => l.startMinute).reduce((a, b) => a < b ? a : b);
}

/// Монгол цагаан толгойн дараалал (Ө нь О-гийн, Ү нь У-гийн дараа) — вэбийн `localeCompare(…, "mn")`.
const _mnAlphabet = 'абвгдеёжзийклмноөпрстуүфхцчшщъыьэюя';

int _mnRank(int unit) {
  final i = _mnAlphabet.indexOf(String.fromCharCode(unit));
  return i < 0 ? unit : 0x10000 + i;
}

/// Монгол дарааллаар харьцуулна (том жижиг үсэг ялгахгүй).
int compareMn(String a, String b) {
  final x = a.toLowerCase().codeUnits;
  final y = b.toLowerCase().codeUnits;
  for (var i = 0; i < x.length && i < y.length; i++) {
    final d = _mnRank(x[i]) - _mnRank(y[i]);
    if (d != 0) return d;
  }
  return x.length - y.length;
}

/// Нэрээр (овгоор биш) эрэмбэлнэ, ижил нэртэй бол овгоор (вэбийн `byFirstName`).
List<BoardStudent> byFirstName(Iterable<BoardStudent> list) => [...list]
  ..sort((a, b) {
    final d = compareMn(a.firstName, b.firstName);
    return d != 0 ? d : compareMn(a.lastName ?? '', b.lastName ?? '');
  });

// ───────── Шүүлтүүр (вэбийн `BoardFilters`) ─────────

/// Самбарын шүүлтүүр.
enum BoardFilter {
  risk,
  attPresent,
  attLate,
  attAbsent,
  attExcused,
  attNone,
  hwDone,
  hwPartial,
  hwNotDone,
  hwNone,
  hwSent,
  onlineYes,
  onlineNo;

  static BoardFilter att(AttendanceStatus? s) => switch (s) {
    AttendanceStatus.present => attPresent,
    AttendanceStatus.late => attLate,
    AttendanceStatus.absent => attAbsent,
    AttendanceStatus.excused => attExcused,
    null => attNone,
  };

  static BoardFilter hw(HomeworkStatus? s) => switch (s) {
    HomeworkStatus.done => hwDone,
    HomeworkStatus.partial => hwPartial,
    HomeworkStatus.notDone => hwNotDone,
    null => hwNone,
  };
}

/// Шүүлтүүрт шаардлагатай өгөгдөл.
@immutable
class BoardFilterData {
  const BoardFilterData({
    required this.recs,
    required this.risk,
    required this.sent,
    required this.online,
    this.quiz = const {},
  });

  final Map<String, DayRec> recs;
  final Map<String, List<RiskFlag>> risk;
  final Set<String> sent;

  /// Онлайнаар бодсон сурагчид.
  final Set<String> online;

  /// Энэ өдрийн шалгалтын оноотой сурагчид — даалгаврын «Тэмдэглээгүй»-д тоолохгүй.
  final Set<String> quiz;

  bool matches(BoardFilter f, String id) {
    final rec = recs[id] ?? DayRec.empty;
    return switch (f) {
      BoardFilter.hwNone => rec.hw == null && !quiz.contains(id),
      BoardFilter.risk => (risk[id] ?? const []).isNotEmpty,
      BoardFilter.hwSent => sent.contains(id),
      BoardFilter.onlineYes => online.contains(id),
      BoardFilter.onlineNo => !online.contains(id),
      BoardFilter.attPresent ||
      BoardFilter.attLate ||
      BoardFilter.attAbsent ||
      BoardFilter.attExcused ||
      BoardFilter.attNone => BoardFilter.att(rec.att) == f,
      BoardFilter.hwDone || BoardFilter.hwPartial || BoardFilter.hwNotDone => BoardFilter.hw(rec.hw) == f,
    };
  }

  /// [ids]-ээс шүүлтүүрт тохирсон нь (дарааллыг хадгална).
  List<String> apply(BoardFilter? f, Iterable<String> ids) => [
    for (final id in ids)
      if (f == null || matches(f, id)) id,
  ];
}
