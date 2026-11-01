// `GET /parent/children/:studentId/history?year=&page=` (docs/api-contract/parent.md §3).
// Гар бичмэл parse — сервер талбар нэмсэн ч эвдрэхгүй. Огноо `@db.Date` бол эхний 10 тэмдэгт л хэрэгтэй.

Map<String, Object?> _m(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};
String? _s(Object? v) => v is String ? v : null;
int _i(Object? v) => v is num ? v.toInt() : 0;
String _title(Object? holder, String key) => _s(_m(_m(holder)[key])['title']) ?? '';
String _className(Object? j) => _s(_m(_m(j)['classroom'])['name']) ?? '';

class HistoryAttempt {
  const HistoryAttempt({required this.id, required this.at, required this.chapter, this.autoCorrect, this.source});

  factory HistoryAttempt.fromJson(Object? j) {
    final m = _m(j);
    return HistoryAttempt(
      id: _s(m['id']) ?? '',
      at: _s(m['occurredOn']) ?? _s(m['createdAt']),
      chapter: _s(_m(_m(m['problem'])['chapter'])['title']) ?? '',
      autoCorrect: m['autoCorrect'] is bool ? m['autoCorrect'] as bool : null,
      source: _s(m['source']),
    );
  }

  final String id;
  final String? at;
  final String chapter;

  /// true — зөв, false — буруу, null — өөрөө үнэлсэн/тодорхойгүй.
  final bool? autoCorrect;
  final String? source;
}

class HistoryMark {
  const HistoryMark({required this.id, required this.date, required this.status, this.comment, this.classroom = ''});

  factory HistoryMark.fromJson(Object? j) {
    final m = _m(j);
    return HistoryMark(
      id: _s(m['id']) ?? '',
      date: _s(m['date']),
      status: _s(m['status']) ?? '',
      comment: _s(m['comment']),
      classroom: _className(m),
    );
  }

  final String id;
  final String? date;
  final String status;
  final String? comment;
  final String classroom;
}

class HistorySubmission {
  const HistorySubmission({required this.id, required this.state, required this.title, this.date});

  factory HistorySubmission.fromJson(Object? j) {
    final m = _m(j);
    return HistorySubmission(
      id: _s(m['id']) ?? '',
      state: _s(m['state']) ?? '',
      title: _title(m, 'assignment'),
      date: _s(m['submittedAt']) ?? _s(_m(m['assignment'])['dueDate']),
    );
  }

  final String id;
  final String state;
  final String title;
  final String? date;
}

class HistoryResult {
  const HistoryResult({required this.id, required this.title, required this.createdAt, this.score, this.max});

  factory HistoryResult.fromJson(Object? j) {
    final m = _m(j);
    return HistoryResult(
      id: _s(m['id']) ?? '',
      title: _title(m, 'test'),
      createdAt: _s(m['createdAt']),
      score: m['totalScore'] as num?,
      max: m['maxScore'] as num?,
    );
  }

  final String id;
  final String title;
  final String? createdAt;
  final num? score;
  final num? max;
}

class HistoryDismissal {
  const HistoryDismissal({required this.id, required this.date, this.approximateAt, this.lastLeftAt, this.classroom = ''});

  factory HistoryDismissal.fromJson(Object? j) {
    final m = _m(j);
    return HistoryDismissal(
      id: _s(m['id']) ?? '',
      date: _s(m['date']),
      approximateAt: _s(m['approximateAt']),
      lastLeftAt: _s(m['lastLeftAt']),
      classroom: _className(m),
    );
  }

  final String id;
  final String? date;

  /// ISO агшин — UB цагаар `HH:mm` харуулна.
  final String? approximateAt;
  final String? lastLeftAt;
  final String classroom;
}

class HistoryPacket {
  const HistoryPacket({required this.id, required this.date, required this.chapter, this.receipts = 0});

  factory HistoryPacket.fromJson(Object? j) {
    final m = _m(j);
    return HistoryPacket(
      id: _s(m['id']) ?? '',
      date: _s(m['date']),
      chapter: _title(m, 'chapter'),
      receipts: (m['receipts'] as List?)?.length ?? 0,
    );
  }

  final String id;
  final String? date;
  final String chapter;
  final int receipts;
}

class HistoryList<T> {
  const HistoryList(this.rows, {this.hasMore = false});

  factory HistoryList.parse(Object? j, T Function(Object?) row) {
    final m = _m(j);
    return HistoryList([for (final r in (m['rows'] as List? ?? const <Object?>[])) row(r)], hasMore: m['hasMore'] == true);
  }

  final List<T> rows;
  final bool hasMore;

  /// Дараагийн хуудас: мөрүүдийг залгаж, `hasMore`-ыг шинэ хуудасных болгоно.
  HistoryList<T> append(HistoryList<T> next) => HistoryList([...rows, ...next.rows], hasMore: next.hasMore);
}

class HistorySummary {
  const HistorySummary({this.activeDays = 0, this.attemptCount = 0, this.learningEventCount = 0});

  factory HistorySummary.fromJson(Object? j) {
    final m = _m(j);
    return HistorySummary(
      activeDays: _i(m['activeDays']),
      attemptCount: _i(m['attemptCount']),
      learningEventCount: _i(m['learningEventCount']),
    );
  }

  final int activeDays;
  final int attemptCount;
  final int learningEventCount;
}

class ParentHistory {
  const ParentHistory({
    required this.year,
    required this.page,
    this.summary = const HistorySummary(),
    this.attempts = const HistoryList([]),
    this.homework = const HistoryList([]),
    this.submissions = const HistoryList([]),
    this.results = const HistoryList([]),
    this.attendance = const HistoryList([]),
    this.dismissals = const HistoryList([]),
    this.packets = const HistoryList([]),
  });

  factory ParentHistory.fromJson(Object? j) {
    final m = _m(j);
    return ParentHistory(
      year: _i(m['year']),
      page: _i(m['page']) == 0 ? 1 : _i(m['page']),
      summary: HistorySummary.fromJson(m['summary']),
      attempts: HistoryList.parse(m['attempts'], HistoryAttempt.fromJson),
      homework: HistoryList.parse(m['homework'], HistoryMark.fromJson),
      submissions: HistoryList.parse(m['submissions'], HistorySubmission.fromJson),
      results: HistoryList.parse(m['results'], HistoryResult.fromJson),
      attendance: HistoryList.parse(m['attendance'], HistoryMark.fromJson),
      dismissals: HistoryList.parse(m['dismissals'], HistoryDismissal.fromJson),
      packets: HistoryList.parse(m['lessonPackets'], HistoryPacket.fromJson),
    );
  }

  final int year;
  final int page;
  final HistorySummary summary;
  final HistoryList<HistoryAttempt> attempts;
  final HistoryList<HistoryMark> homework;
  final HistoryList<HistorySubmission> submissions;
  final HistoryList<HistoryResult> results;
  final HistoryList<HistoryMark> attendance;
  final HistoryList<HistoryDismissal> dismissals;
  final HistoryList<HistoryPacket> packets;

  bool get hasMore =>
      attempts.hasMore ||
      homework.hasMore ||
      submissions.hasMore ||
      results.hasMore ||
      attendance.hasMore ||
      dismissals.hasMore ||
      packets.hasMore;

  bool get isEmpty =>
      attempts.rows.isEmpty &&
      homework.rows.isEmpty &&
      submissions.rows.isEmpty &&
      results.rows.isEmpty &&
      attendance.rows.isEmpty &&
      dismissals.rows.isEmpty &&
      packets.rows.isEmpty;

  /// Дараагийн хуудсыг (page+1) энэ хуудсанд нэгтгэнэ. Нэгтгэсэн дүнгийн `summary` нь жилийнх (хуудсаас үл хамаарна).
  ParentHistory append(ParentHistory next) => ParentHistory(
    year: year,
    page: next.page,
    summary: summary,
    attempts: attempts.append(next.attempts),
    homework: homework.append(next.homework),
    submissions: submissions.append(next.submissions),
    results: results.append(next.results),
    attendance: attendance.append(next.attendance),
    dismissals: dismissals.append(next.dismissals),
    packets: packets.append(next.packets),
  );
}
