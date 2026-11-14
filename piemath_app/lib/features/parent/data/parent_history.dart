// `GET /parent/children/:studentId/history?year=&page=` (docs/api-contract/parent.md §3).
// Гар бичмэл parse — сервер талбар нэмсэн ч эвдрэхгүй. Огноо `@db.Date` бол эхний 10 тэмдэгт л хэрэгтэй.

Map<String, Object?> _m(Object? j) => j is Map ? j.cast<String, Object?>() : const <String, Object?>{};
String? _s(Object? v) => v is String ? v : null;
int _i(Object? v) => v is num ? v.toInt() : 0;
String _title(Object? holder, String key) => _s(_m(_m(holder)[key])['title']) ?? '';
String _className(Object? j) => _s(_m(_m(j)['classroom'])['name']) ?? '';

class HistoryAttempt {
  const HistoryAttempt({
    required this.id,
    required this.at,
    required this.chapter,
    this.chapterId,
    this.autoCorrect,
    this.source,
  });

  factory HistoryAttempt.fromJson(Object? j) {
    final m = _m(j);
    return HistoryAttempt(
      id: _s(m['id']) ?? '',
      at: _s(m['occurredOn']) ?? _s(m['createdAt']),
      chapter: _s(_m(_m(m['problem'])['chapter'])['title']) ?? '',
      chapterId: _s(_m(m['problem'])['chapterId']),
      autoCorrect: m['autoCorrect'] is bool ? m['autoCorrect'] as bool : null,
      source: _s(m['source']),
    );
  }

  final String id;
  final String? at;
  final String chapter;

  /// Бүлгийн онол нээхэд (`/parent/children/:id/theory/:chapterId`).
  final String? chapterId;

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

/// Даалгаврын илгээлтийн нэг бүртгэл (сурагч илгээсэн, багш баталсан/буцаасан …).
class HistoryRevision {
  const HistoryRevision({
    required this.id,
    required this.action,
    required this.state,
    this.at,
    this.studentNote,
    this.reviewNote,
    this.imageKeys = const [],
  });

  factory HistoryRevision.fromJson(Object? j) {
    final m = _m(j);
    return HistoryRevision(
      id: _s(m['id']) ?? '',
      action: _s(m['action']) ?? '',
      state: _s(m['state']) ?? '',
      at: _s(m['at']),
      studentNote: _s(m['studentNote']),
      reviewNote: _s(m['reviewNote']),
      imageKeys: _keys(m['imageKeys']),
    );
  }

  final String id;

  /// `SUBMIT | APPROVE | RETURN | MARK_IN_CLASS | LEGACY`.
  final String action;
  final String state;
  final String? at;
  final String? studentNote;
  final String? reviewNote;
  final List<String> imageKeys;

  /// Багшийн хариу (батлах, буцаах, ангид шалгах).
  bool get isReview => action == 'APPROVE' || action == 'RETURN' || action == 'MARK_IN_CLASS';
}

class HistorySubmission {
  const HistorySubmission({
    required this.id,
    required this.state,
    required this.title,
    this.date,
    this.studentNote,
    this.reviewNote,
    this.imageKeys = const [],
    this.revisions = const [],
  });

  factory HistorySubmission.fromJson(Object? j) {
    final m = _m(j);
    return HistorySubmission(
      id: _s(m['id']) ?? '',
      state: _s(m['state']) ?? '',
      title: _title(m, 'assignment'),
      date: _s(m['submittedAt']) ?? _s(_m(m['assignment'])['dueDate']),
      studentNote: _s(m['studentNote']),
      reviewNote: _s(m['reviewNote']),
      imageKeys: _keys(m['imageKeys']),
      revisions: [for (final r in (m['revisions'] as List? ?? const <Object?>[])) HistoryRevision.fromJson(r)],
    );
  }

  final String id;
  final String state;
  final String title;
  final String? date;
  final String? studentNote;
  final String? reviewNote;
  final List<String> imageKeys;

  /// Энэ жилийн бүртгэлүүд (огноогоор өсөх).
  final List<HistoryRevision> revisions;

  HistoryRevision? get firstSubmit {
    for (final r in revisions) {
      if (r.action == 'SUBMIT') return r;
    }
    return null;
  }

  HistoryRevision? get lastReview {
    HistoryRevision? last;
    for (final r in revisions) {
      if (r.isReview) last = r;
    }
    return last;
  }
}

/// «Анхны хариулт, давталт, засвар» — суралцах урсгалын нотолгоо (`learning.rows[].evidence`).
class HistoryLearning {
  const HistoryLearning({required this.id, required this.kind, this.at, this.answer, this.correct, this.mode, this.flagged = false});

  /// `evidence` байхгүй мөрийг null (вэб ч харуулдаггүй).
  static HistoryLearning? fromJson(Object? j) {
    final m = _m(j);
    final e = m['evidence'];
    if (e is! Map) return null;
    final ev = e.cast<String, Object?>();
    final flags = ev['flags'];
    return HistoryLearning(
      id: _s(m['id']) ?? '',
      at: _s(m['at']),
      kind: _s(ev['kind']) ?? '',
      answer: _s(ev['answer']),
      correct: ev['correct'] is bool ? ev['correct']! as bool : null,
      mode: _s(ev['mode']),
      flagged: flags is List && flags.isNotEmpty,
    );
  }

  final String id;
  final String? at;
  final String kind;

  /// LaTeX хариу (MathText-ээр).
  final String? answer;
  final bool? correct;

  /// `classroom` (дэвтрийн өөрийн тэмдэглэгээ), `probe` (хугацааны дараах шинэ шалгалт).
  final String? mode;

  /// Сурагч эргэлзсэн, таасан эсвэл тусламжийн тэмдэглэгээ нэмсэн.
  final bool flagged;

  String get kindLabel => switch (kind) {
        'first' => 'Анхны хариулт',
        'retry-before-solution' => 'Бодолт үзэхээс өмнөх давталт',
        'solution-assisted-correction' => 'Бодолт үзсэн засвар',
        'solution-viewed' => 'Бодолт үзсэн',
        _ => 'Сурах үйлдэл',
      };

  String get resultLabel {
    final base = correct == null ? 'Үнэлгээ байхгүй' : (correct! ? 'Зөв' : 'Дахин бодох');
    return switch (mode) {
      'classroom' => '$base, дэвтрийн өөрийн тэмдэглэгээ',
      'probe' => '$base, хугацааны дараах шинэ шалгалт',
      _ => base,
    };
  }
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

List<String> _keys(Object? v) => [
  for (final k in (v is List ? v : const <Object?>[]))
    if (k is String && k.isNotEmpty) k,
];

class HistoryPacket {
  const HistoryPacket({
    required this.id,
    required this.date,
    required this.chapter,
    this.receipts = 0,
    this.imageKeys = const [],
  });

  factory HistoryPacket.fromJson(Object? j) {
    final m = _m(j);
    final receipts = m['receipts'] is List ? m['receipts']! as List : const <Object?>[];
    return HistoryPacket(
      id: _s(m['id']) ?? '',
      date: _s(m['date']),
      chapter: _title(m, 'chapter'),
      receipts: receipts.length,
      imageKeys: [for (final r in receipts) ..._keys(_m(r)['imageKeys'])],
    );
  }

  final String id;
  final String? date;
  final String chapter;
  final int receipts;

  /// Хүүхдийн илгээсэн хавсралтын зураг (`/files/:key`).
  final List<String> imageKeys;
}

/// `GET /parent/children/:studentId/theory/:chapterId` (parent.md §3.1).
class ChildTheory {
  const ChildTheory({required this.chapterTitle, this.blocks = const []});

  factory ChildTheory.fromJson(Object? j) {
    final m = _m(j);
    return ChildTheory(
      chapterTitle: _title(m, 'chapter'),
      blocks: [
        for (final b in (m['theories'] as List? ?? const <Object?>[]))
          TheoryBlock(
            id: _s(_m(b)['id']) ?? '',
            title: _s(_m(b)['title']) ?? '',
            content: _s(_m(b)['content']) ?? '',
            imageKeys: _keys(_m(b)['imageKeys']),
          ),
      ],
    );
  }

  final String chapterTitle;
  final List<TheoryBlock> blocks;
}

class TheoryBlock {
  const TheoryBlock({required this.id, required this.title, required this.content, this.imageKeys = const []});

  final String id;
  final String title;

  /// LaTeX бичвэр — `MathText`-ээр зурна.
  final String content;
  final List<String> imageKeys;
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
    this.learning = const HistoryList([]),
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
      learning: _learning(m['learning']),
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
  final HistoryList<HistoryLearning> learning;
  final HistoryList<HistoryMark> homework;
  final HistoryList<HistorySubmission> submissions;
  final HistoryList<HistoryResult> results;
  final HistoryList<HistoryMark> attendance;
  final HistoryList<HistoryDismissal> dismissals;
  final HistoryList<HistoryPacket> packets;

  bool get hasMore =>
      attempts.hasMore ||
      learning.hasMore ||
      homework.hasMore ||
      submissions.hasMore ||
      results.hasMore ||
      attendance.hasMore ||
      dismissals.hasMore ||
      packets.hasMore;

  bool get isEmpty =>
      attempts.rows.isEmpty &&
      learning.rows.isEmpty &&
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
    learning: learning.append(next.learning),
    homework: homework.append(next.homework),
    submissions: submissions.append(next.submissions),
    results: results.append(next.results),
    attendance: attendance.append(next.attendance),
    dismissals: dismissals.append(next.dismissals),
    packets: packets.append(next.packets),
  );
}

HistoryList<HistoryLearning> _learning(Object? j) {
  final m = _m(j);
  return HistoryList([
    for (final r in (m['rows'] as List? ?? const <Object?>[])) ?HistoryLearning.fromJson(r),
  ], hasMore: m['hasMore'] == true);
}
