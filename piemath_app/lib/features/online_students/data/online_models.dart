import '../../../core/time/ub_time.dart';
import '../../results/data/results_models.dart' show jsonInt, jsonList, jsonMap, jsonNum, jsonStr;

/// Онлайн сурагчдын загварууд — вэбийн `components/online/types.ts`
/// (`api/src/progress/progress.service.ts`-ийн хариутай тулгасан).

/// Идэвхийн түвшин (сервер: сүүлийн идэвхээс 3 хоног хүртэл идэвхтэй, 10 хоног хүртэл сулрах).
enum Engagement {
  active('ACTIVE', 'Идэвхтэй'),
  slowing('SLOWING', 'Сулраж байна'),
  dormant('DORMANT', 'Идэвхгүй');

  const Engagement(this.api, this.label);
  final String api;
  final String label;

  static Engagement fromApi(Object? v) => switch (v) {
    'ACTIVE' => active,
    'SLOWING' => slowing,
    _ => dormant,
  };
}

class ActivePass {
  const ActivePass({required this.name, this.expiresAt});

  static ActivePass? fromJson(Object? j) {
    if (j is! Map) return null;
    final m = jsonMap(j);
    return ActivePass(name: jsonStr(m['name']), expiresAt: parseApiInstant(m['expiresAt'] as String?));
  }

  final String name;
  final DateTime? expiresAt;
}

/// `GET /progress/online-students` мөр.
class OnlineStudent {
  const OnlineStudent({
    required this.id,
    required this.name,
    required this.attempts7d,
    required this.attempts30d,
    required this.testsTaken,
    required this.engagement,
    this.studentCode,
    this.grade,
    this.activePass,
    this.lastActiveAt,
    this.successRate,
  });

  factory OnlineStudent.fromJson(Map<String, Object?> j) {
    final p = jsonMap(j['problemsAttempted']);
    return OnlineStudent(
      id: jsonStr(j['studentId']),
      studentCode: j['studentCode'] as String?,
      name: jsonStr(j['name']),
      grade: jsonNum(j['grade'])?.toInt(),
      activePass: ActivePass.fromJson(j['activePass']),
      lastActiveAt: parseApiInstant(j['lastActiveAt'] as String?),
      attempts7d: jsonInt(p['last7d']),
      attempts30d: jsonInt(p['last30d']),
      successRate: jsonNum(j['successRate'])?.round(),
      testsTaken: jsonInt(j['testsTaken']),
      engagement: Engagement.fromApi(j['engagement']),
    );
  }

  final String id;
  final String? studentCode;

  /// Сервер «Овог Нэр» болгож нэгтгэсэн.
  final String name;
  final int? grade;
  final ActivePass? activePass;
  final DateTime? lastActiveAt;
  final int attempts7d;
  final int attempts30d;

  /// Сүүлийн 30 хоногийн, оролдлогогүй бол null.
  final int? successRate;
  final int testsTaken;
  final Engagement engagement;

  /// Эрх хүчинтэй хэрнээ идэвхгүй — эргэж холбогдох хэрэгтэй (жагсаалтын дээд талд).
  bool get dormantWithPass => engagement == Engagement.dormant && activePass != null;
}

class OnlinePage {
  const OnlinePage({required this.page, required this.pageSize, required this.total, required this.items});

  factory OnlinePage.fromJson(Map<String, Object?> j) => OnlinePage(
    page: jsonInt(j['page'], 1),
    pageSize: jsonInt(j['pageSize'], 50),
    total: jsonInt(j['total']),
    items: [for (final i in jsonList(j['items'])) OnlineStudent.fromJson(i)],
  );

  final int page;
  final int pageSize;
  final int total;
  final List<OnlineStudent> items;

  bool get hasMore => page * pageSize < total;
}

class ChapterProgress {
  const ChapterProgress({
    required this.chapterId,
    required this.title,
    required this.theoryRead,
    required this.videosWatched,
    required this.problemsAttempted,
    required this.problemsCorrect,
    this.successRate,
  });

  factory ChapterProgress.fromJson(Map<String, Object?> j) => ChapterProgress(
    chapterId: jsonStr(j['chapterId']),
    title: jsonStr(j['title']),
    theoryRead: j['theoryRead'] == true,
    videosWatched: jsonInt(j['videosWatched']),
    problemsAttempted: jsonInt(j['problemsAttempted']),
    problemsCorrect: jsonInt(j['problemsCorrect']),
    successRate: jsonNum(j['successRate'])?.round(),
  );

  final String chapterId;
  final String title;
  final bool theoryRead;
  final int videosWatched;
  final int problemsAttempted;
  final int problemsCorrect;
  final int? successRate;
}

class WeakTopic {
  const WeakTopic({required this.tag, required this.attempts, required this.successRate});

  factory WeakTopic.fromJson(Map<String, Object?> j) =>
      WeakTopic(tag: jsonStr(j['tag']), attempts: jsonInt(j['attempts']), successRate: jsonInt(j['successRate']));

  final String tag;
  final int attempts;
  final int successRate;
}

class TestHistory {
  const TestHistory({
    required this.testId,
    required this.title,
    required this.type,
    required this.totalScore,
    required this.maxScore,
    this.createdAt,
  });

  factory TestHistory.fromJson(Map<String, Object?> j) => TestHistory(
    testId: jsonStr(j['testId']),
    title: jsonStr(j['title']),
    type: jsonStr(j['type']),
    totalScore: jsonNum(j['totalScore']) ?? 0,
    maxScore: jsonNum(j['maxScore']) ?? 0,
    createdAt: parseApiInstant(j['createdAt'] as String?),
  );

  final String testId;
  final String title;
  final String type;
  final double totalScore;
  final double maxScore;
  final DateTime? createdAt;

  /// Вэбтэй ижил: `maxScore` 0 бол 0%.
  int get percent => maxScore > 0 ? (totalScore / maxScore * 100).round() : 0;
}

class PassHistory {
  const PassHistory({required this.name, this.startsAt, this.expiresAt});

  factory PassHistory.fromJson(Map<String, Object?> j) => PassHistory(
    name: jsonStr(j['name']),
    startsAt: parseApiInstant(j['startsAt'] as String?),
    expiresAt: parseApiInstant(j['expiresAt'] as String?),
  );

  final String name;
  final DateTime? startsAt;
  final DateTime? expiresAt;
}

class ActivityDay {
  const ActivityDay({required this.date, required this.count, required this.level});

  factory ActivityDay.fromJson(Map<String, Object?> j) =>
      ActivityDay(date: jsonStr(j['date']), count: jsonInt(j['count']), level: jsonInt(j['level']).clamp(0, 4));

  /// `YYYY-MM-DD` (UB).
  final String date;
  final int count;

  /// 0–4.
  final int level;
}

/// `GET /progress/student/:id`.
class OnlineDetail {
  const OnlineDetail({
    required this.id,
    required this.name,
    required this.passHistory,
    required this.currentStreak,
    required this.longestStreak,
    required this.totalActiveDays,
    required this.days,
    required this.chapters,
    required this.weakTopics,
    required this.tests,
    this.studentCode,
    this.grade,
    this.school,
    this.activePass,
  });

  factory OnlineDetail.fromJson(Map<String, Object?> j) {
    final s = jsonMap(j['student']);
    final streak = jsonMap(j['streak']);
    final daily = jsonMap(j['dailyActivity']);
    return OnlineDetail(
      id: jsonStr(s['id']),
      studentCode: s['studentCode'] as String?,
      name: jsonStr(s['name']),
      grade: jsonNum(s['grade'])?.toInt(),
      school: s['school'] as String?,
      activePass: ActivePass.fromJson(j['activePass']),
      passHistory: [for (final p in jsonList(j['passHistory'])) PassHistory.fromJson(p)],
      currentStreak: jsonInt(streak['currentStreak']),
      longestStreak: jsonInt(streak['longestStreak']),
      totalActiveDays: jsonInt(streak['totalActiveDays']),
      days: [for (final d in jsonList(daily['days'])) ActivityDay.fromJson(d)],
      chapters: [for (final c in jsonList(j['chapters'])) ChapterProgress.fromJson(c)],
      weakTopics: [for (final t in jsonList(j['weakestTopics'])) WeakTopic.fromJson(t)],
      tests: [for (final t in jsonList(j['tests'])) TestHistory.fromJson(t)],
    );
  }

  final String id;
  final String? studentCode;
  final String name;
  final int? grade;
  final String? school;
  final ActivePass? activePass;
  final List<PassHistory> passHistory;
  final int currentStreak;
  final int longestStreak;
  final int totalActiveDays;
  final List<ActivityDay> days;
  final List<ChapterProgress> chapters;
  final List<WeakTopic> weakTopics;
  final List<TestHistory> tests;

  int get totalAttempts => chapters.fold(0, (s, c) => s + c.problemsAttempted);

  int get totalCorrect => chapters.fold(0, (s, c) => s + c.problemsCorrect);

  /// Нийт амжилтын хувь, оролдлогогүй бол null.
  int? get overallSuccess => totalAttempts > 0 ? (totalCorrect / totalAttempts * 100).round() : null;
}

/// Хугацааны тэнхлэгийн мөр (`GET /progress/student/:id/timeline`).
sealed class TimelineItem {
  const TimelineItem(this.at);

  static TimelineItem? fromJson(Map<String, Object?> j) {
    final at = parseApiInstant(j['at'] as String?);
    if (at == null) return null;
    return switch (j['kind']) {
      'ATTEMPT' => TimelineAttempt(
        at,
        chapterTitle: jsonStr(j['chapterTitle']),
        source: jsonStr(j['source']),
        selfState: j['selfState'] as String?,
        autoCorrect: j['autoCorrect'] as bool?,
        // Одоогийн сервер `id` илгээдэггүй (вэбийн тайлбар) — ирвэл л засах товч гарна.
        attemptId: (j['attemptId'] ?? j['id']) as String?,
      ),
      _ => TimelineEvent(at, type: jsonStr(j['type']), durationMs: jsonNum(j['durationMs'])?.toInt()),
    };
  }

  final DateTime at;
}

final class TimelineEvent extends TimelineItem {
  const TimelineEvent(super.at, {required this.type, this.durationMs});

  final String type;
  final int? durationMs;
}

final class TimelineAttempt extends TimelineItem {
  const TimelineAttempt(
    super.at, {
    required this.chapterTitle,
    required this.source,
    this.selfState,
    this.autoCorrect,
    this.attemptId,
  });

  final String chapterTitle;
  final String source;
  final String? selfState;
  final bool? autoCorrect;
  final String? attemptId;

  TimelineAttempt withState(String state) => TimelineAttempt(
    at,
    chapterTitle: chapterTitle,
    source: source,
    selfState: state,
    autoCorrect: autoCorrect,
    attemptId: attemptId,
  );
}

/// Тест оноох сонголт (`GET /tests`).
class TestPick {
  const TestPick({required this.id, required this.title, this.topic});

  factory TestPick.fromJson(Map<String, Object?> j) {
    final ch = jsonMap(j['chapter']);
    final topic = jsonMap(ch['topic'])['name'] as String? ?? ch['title'] as String?;
    return TestPick(id: jsonStr(j['id']), title: jsonStr(j['title']), topic: topic);
  }

  final String id;
  final String title;
  final String? topic;

  /// Вэбийн `testLabel`.
  String get label => topic == null || topic!.isEmpty ? title : '$title, $topic';
}
