import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';

/// Гэрийн даалгаврын загварууд — `docs/api-contract/homework.md`.
/// Бодож байх үед сервер зөв хариу, `isCorrect`, бодолт илгээхгүй; ИЛГЭЭСНИЙ ДАРАА л алдсан бодлогын
/// зөв хариу, баталгаажсан бодолт, бичлэг (`review`) ирнэ (эзэн 2026-11-03).

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();
List<Object?> _list(Object? j) => (j as List?) ?? const [];
String? _str(Object? v) => v is String ? v : null;
int _int(Object? v, [int fallback = 0]) => v is num ? v.toInt() : fallback;
List<String> _strings(Object? v) => [for (final x in _list(v)) if (x is String) x];

/// Багшийн тэмдэглэгээ (танхимын загвар).
enum HomeworkMark {
  done('DONE'),
  partial('PARTIAL'),
  notDone('NOT_DONE');

  const HomeworkMark(this.api);
  final String api;

  static HomeworkMark? parse(Object? v) {
    for (final m in values) {
      if (m.api == v) return m;
    }
    return null;
  }
}

enum HwItemStatus {
  notStarted,
  inProgress,
  submitted;

  static HwItemStatus parse(Object? v) => switch (v) {
        'SUBMITTED' => submitted,
        'IN_PROGRESS' => inProgress,
        _ => notStarted,
      };
}

@immutable
class HwScore {
  const HwScore(this.correct, this.total);

  static HwScore? parse(Object? j) {
    if (j is! Map) return null;
    return HwScore(_int(j['correct']), _int(j['total']));
  }

  final int correct;
  final int total;
}

/// Ангид хийсэн тестийн нөгөө (B) хувилбар — гэртээ онлайнаар бодно.
@immutable
class HwItem {
  const HwItem({
    required this.testId,
    required this.title,
    required this.variantLabel,
    required this.problemCount,
    required this.timeLimitMin,
    required this.status,
    required this.checksUsed,
    required this.maxChecks,
    required this.score,
    required this.late,
  });

  factory HwItem.fromJson(Object? json) {
    final m = _map(json);
    return HwItem(
      testId: m['testId']! as String,
      title: _str(m['title']) ?? '',
      variantLabel: _str(m['variantLabel']),
      problemCount: _int(m['problemCount']),
      timeLimitMin: m['timeLimitMin'] is num ? _int(m['timeLimitMin']) : null,
      status: HwItemStatus.parse(m['status']),
      checksUsed: _int(m['checksUsed']),
      maxChecks: _int(m['maxChecks'], 2),
      score: HwScore.parse(m['score']),
      late: m['late'] == true,
    );
  }

  final String testId;
  final String title;
  final String? variantLabel;
  final int problemCount;
  final int? timeLimitMin;
  final HwItemStatus status;
  final int checksUsed;
  final int maxChecks;
  final HwScore? score;
  final bool late;
}

/// Илгээсэн дэвтрийн зураг (нэг баримт, 6 хүртэл хуудас).
@immutable
class HwPhoto {
  const HwPhoto({required this.id, required this.fileKey, required this.pages, required this.uploadedAt});

  static HwPhoto? parse(Object? json) {
    if (json is! Map) return null;
    final m = json.cast<String, Object?>();
    return HwPhoto(
      id: m['id']! as String,
      fileKey: m['fileKey']! as String,
      pages: _int(m['pages'], 1),
      uploadedAt: parseApiInstant(_str(m['uploadedAt'])),
    );
  }

  final String id;
  final String fileKey;
  final int pages;
  final DateTime? uploadedAt;
}

/// Хичээлийн нэг өдөр (`GET /homework/my`).
@immutable
class HwDay {
  const HwDay({
    required this.date,
    required this.classroomId,
    required this.classroomName,
    required this.deadlineAt,
    required this.items,
    required this.photo,
    required this.mark,
    required this.markComment,
    required this.upcoming,
    required this.topic,
  });

  factory HwDay.fromJson(Object? json) {
    final m = _map(json);
    return HwDay(
      date: (_str(m['date']) ?? '').padRight(10).substring(0, 10).trim(),
      classroomId: m['classroomId']! as String,
      classroomName: _str(m['classroomName']) ?? '',
      deadlineAt: parseApiInstant(_str(m['deadlineAt'])),
      items: [for (final i in _list(m['items'])) HwItem.fromJson(i)],
      photo: HwPhoto.parse(m['photo']),
      mark: HomeworkMark.parse(m['mark']),
      markComment: _str(m['markComment']),
      upcoming: m['upcoming'] == true,
      topic: _str(m['topic']),
    );
  }

  /// `YYYY-MM-DD` (UB өдөр).
  final String date;
  final String classroomId;
  final String classroomName;
  final DateTime? deadlineAt;
  final List<HwItem> items;
  final HwPhoto? photo;
  final HomeworkMark? mark;
  final String? markComment;
  final bool upcoming;
  final String? topic;

  String get id => '$date/$classroomId';

  HwDay withPhoto(HwPhoto? p) => HwDay(
        date: date,
        classroomId: classroomId,
        classroomName: classroomName,
        deadlineAt: deadlineAt,
        items: items,
        photo: p,
        mark: mark,
        markComment: markComment,
        upcoming: upcoming,
        topic: topic,
      );
}

// ---------------------------------------------------------------------------
// Онлайн загвар (Assignment / Submission)

/// Миний илгээлтийн төлөв (`myStatus`).
enum AssignmentStatus {
  notDone('NOT_DONE', 'Илгээгээгүй'),
  submitted('SUBMITTED', 'Илгээсэн, шалгаагүй'),
  doneOnline('DONE_ONLINE', 'Батлагдсан'),
  doneInClass('DONE_IN_CLASS', 'Ангид шалгасан'),
  returned('RETURNED', 'Буцаасан — дахин илгээнэ');

  const AssignmentStatus(this.api, this.label);
  final String api;
  final String label;

  static AssignmentStatus parse(Object? v) => values.firstWhere((s) => s.api == v, orElse: () => notDone);
}

@immutable
class MySubmission {
  const MySubmission({required this.imageKeys, required this.studentNote, required this.reviewNote, required this.submittedAt});

  static MySubmission? parse(Object? json) {
    if (json is! Map) return null;
    final m = json.cast<String, Object?>();
    return MySubmission(
      imageKeys: _strings(m['imageKeys']),
      studentNote: _str(m['studentNote']) ?? _str(m['note']),
      reviewNote: _str(m['reviewNote']),
      submittedAt: parseApiInstant(_str(m['submittedAt'])),
    );
  }

  final List<String> imageKeys;
  final String? studentNote;

  /// Багшийн сурагчид харагдах тайлбар (буцаасан шалтгаан).
  final String? reviewNote;
  final DateTime? submittedAt;
}

@immutable
class Assignment {
  const Assignment({
    required this.id,
    required this.title,
    required this.description,
    required this.imageKeys,
    required this.dueDate,
    required this.lessonLabel,
    required this.lessonDate,
    required this.classroomName,
    required this.canSubmit,
    required this.status,
    required this.submission,
  });

  factory Assignment.fromJson(Object? json) {
    final m = _map(json);
    final lesson = m['lesson'] is Map ? (m['lesson']! as Map).cast<String, Object?>() : const <String, Object?>{};
    final classroom = m['classroom'] is Map ? (m['classroom']! as Map).cast<String, Object?>() : const <String, Object?>{};
    return Assignment(
      id: m['id']! as String,
      title: _str(m['title']) ?? '',
      description: _str(m['description']),
      imageKeys: _strings(m['imageKeys']),
      dueDate: parseApiInstant(_str(m['dueDate'])),
      lessonLabel: _str(lesson['label']),
      lessonDate: _str(lesson['date']),
      classroomName: _str(classroom['name']) ?? '',
      canSubmit: m['canSubmit'] == true,
      status: AssignmentStatus.parse(m['myStatus']),
      submission: MySubmission.parse(m['mySubmission']),
    );
  }

  final String id;
  final String title;
  final String? description;

  /// Багшийн хавсаргасан зураг.
  final List<String> imageKeys;
  final DateTime? dueDate;
  final String? lessonLabel;
  final String? lessonDate;
  final String classroomName;
  final bool canSubmit;
  final AssignmentStatus status;
  final MySubmission? submission;
}

// ---------------------------------------------------------------------------
// B хувилбарын онлайн бодолт (`/homework/attempts*`)

enum CheckResult {
  correct,
  wrong,
  blank;

  static CheckResult parse(Object? v) => switch (v) {
        'CORRECT' => correct,
        'WRONG' => wrong,
        _ => blank,
      };
}

Map<String, CheckResult>? parseResults(Object? v) {
  if (v is! Map) return null;
  return {for (final e in v.entries) e.key as String: CheckResult.parse(e.value)};
}

@immutable
class HwChoice {
  const HwChoice({required this.label, required this.text, required this.imageKey});

  final String label;
  final String text;
  final String? imageKey;
}

@immutable
class HwProblem {
  const HwProblem({
    required this.id,
    required this.order,
    required this.format,
    required this.statementText,
    required this.imageKey,
    required this.choices,
    required this.fillSlots,
  });

  factory HwProblem.fromJson(Object? json) {
    final m = _map(json);
    final choices = m['choices'];
    return HwProblem(
      id: m['id']! as String,
      order: _int(m['order']),
      format: _str(m['format']) ?? '',
      statementText: _str(m['statementText']),
      imageKey: _str(m['imageKey']),
      choices: choices is List
          ? [
              for (final c in choices)
                if (c is Map)
                  HwChoice(label: _str(c['label']) ?? '', text: _str(c['text']) ?? '', imageKey: _str(c['imageKey'])),
            ]
          : null,
      fillSlots: _strings(m['fillSlots']),
    );
  }

  final String id;
  final int order;
  final String format;
  final String? statementText;
  final String? imageKey;

  /// null = нөхөх/чөлөөт хариу.
  final List<HwChoice>? choices;

  /// FILL_NUMBER нүдний түлхүүрүүд (ж: «a», «b»). Хоосон бол нэг хариу.
  final List<String> fillSlots;
}

/// Идэвхийн тоолуур (эзэн 2026-11-03): бодсон хугацаа, апп-аас гарсан тоо/хугацаа. Сервер зөвхөн өсгөнө.
@immutable
class HwActivity {
  const HwActivity({this.activeSec = 0, this.awaySec = 0, this.leaveCount = 0});

  factory HwActivity.parse(Object? v) {
    if (v is! Map) return const HwActivity();
    return HwActivity(activeSec: _int(v['activeSec']), awaySec: _int(v['awaySec']), leaveCount: _int(v['leaveCount']));
  }

  final int activeSec;
  final int awaySec;
  final int leaveCount;

  Map<String, Object?> toJson() => {'activeSec': activeSec, 'awaySec': awaySec, 'leaveCount': leaveCount};
}

/// Илгээсний дараах нэг (алдсан) бодлогын зөв хариу, бодолт, бичлэг.
@immutable
class HwReviewItem {
  const HwReviewItem({this.correct, this.solution, this.videoUrl});

  factory HwReviewItem.fromJson(Object? json) {
    final m = json is Map ? json.cast<String, Object?>() : const <String, Object?>{};
    final video = m['video'];
    final url = video is Map ? _str(video['url']) : null;
    final c = m['correct'];
    return HwReviewItem(
      correct: c is String || c is Map ? c : null,
      solution: _str(m['solution']),
      videoUrl: url != null && _safeVideo(url) ? url : null,
    );
  }

  /// `"B"`, `"12"` эсвэл `{a: "1", b: "2"}`; null = нээгдээгүй.
  final Object? correct;
  final String? solution;
  final String? videoUrl;

  static bool _safeVideo(String url) {
    final u = Uri.tryParse(url);
    return u != null && u.scheme == 'https' && (u.host.endsWith('youtube.com') || u.host == 'youtu.be');
  }
}

@immutable
class HwReview {
  const HwReview({required this.locked, required this.opensAt, required this.items});

  static HwReview? parse(Object? v) {
    if (v is! Map) return null;
    final items = v['items'];
    return HwReview(
      locked: v['locked'] == true,
      opensAt: parseApiInstant(_str(v['opensAt'])),
      items: items is Map
          ? {for (final e in items.entries) e.key as String: HwReviewItem.fromJson(e.value)}
          : const {},
    );
  }

  /// Тест бусад ангид бодогдох тул зөв хариу түр нээгдэхгүй.
  final bool locked;

  /// Хариулаагүй бодлогын зөв хариу нээгдэх агшин (нууж байгаа үед).
  final DateTime? opensAt;
  final Map<String, HwReviewItem> items;
}

@immutable
class HwAttempt {
  const HwAttempt({
    required this.attemptId,
    required this.submitted,
    required this.remainingSec,
    required this.checksUsed,
    required this.maxChecks,
    required this.score,
    required this.problems,
    required this.answers,
    required this.lastCheck,
    this.activity = const HwActivity(),
    this.review,
  });

  factory HwAttempt.fromJson(Object? json) {
    final m = _map(json);
    final problems = [for (final p in _list(m['problems'])) HwProblem.fromJson(p)]..sort((a, b) => a.order.compareTo(b.order));
    return HwAttempt(
      attemptId: m['attemptId']! as String,
      submitted: m['status'] == 'SUBMITTED',
      remainingSec: m['remainingSec'] is num ? _int(m['remainingSec']) : null,
      checksUsed: _int(m['checksUsed']),
      maxChecks: _int(m['maxChecks'], 2),
      score: HwScore.parse(m['score']),
      problems: problems,
      answers: m['answers'] is Map ? (m['answers']! as Map).cast<String, Object?>() : <String, Object?>{},
      lastCheck: parseResults(m['lastCheck']),
      activity: HwActivity.parse(m['activity']),
      review: HwReview.parse(m['review']),
    );
  }

  final String attemptId;
  final bool submitted;
  final int? remainingSec;
  final int checksUsed;
  final int maxChecks;
  final HwScore? score;
  final List<HwProblem> problems;
  final Map<String, Object?> answers;
  final Map<String, CheckResult>? lastCheck;
  final HwActivity activity;

  /// Илгээсэн бол алдсан бодлогын зөв хариу; бодож байгаа бол null.
  final HwReview? review;
}

@immutable
class CheckOutcome {
  const CheckOutcome({required this.results, required this.correct, required this.total, this.checksUsed, this.review});

  factory CheckOutcome.fromJson(Object? json) {
    final m = _map(json);
    final score = m['score'] is Map ? (m['score']! as Map) : m;
    return CheckOutcome(
      results: parseResults(m['results']) ?? const {},
      correct: _int(score['correct']),
      total: _int(score['total']),
      checksUsed: m['checksUsed'] is num ? _int(m['checksUsed']) : null,
      review: HwReview.parse(m['review']),
    );
  }

  final Map<String, CheckResult> results;
  final int correct;
  final int total;
  final int? checksUsed;

  /// Зөвхөн илгээх (`submit`) хариунд.
  final HwReview? review;
}
