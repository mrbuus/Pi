import 'package:flutter/foundation.dart';

import 'json.dart';

/// Хичээл, бүлэг, видеоны загварууд — `api/src/lessons`, `api/src/videos` (кодоос баталгаажуулсан хэлбэр).

/// Номын нэр сурагчид: `displayName ?? title`. Номын `code`-ийг ХЭЗЭЭ Ч харуулахгүй.
String studentBookName(Object? rawBook) {
  final b = asMap(rawBook);
  final dn = asStr(b['displayName']);
  return (dn != null && dn.trim().isNotEmpty) ? dn : (asStr(b['title']) ?? '');
}

@immutable
class LessonChapter {
  const LessonChapter({
    required this.id,
    required this.title,
    this.order = 0,
    this.grade,
    this.bookName = '',
    this.bookKey = '',
    this.theoryCount = 0,
    this.videoCount = 0,
    this.theoriesRead = 0,
    this.videosWatched = 0,
    this.completed = false,
  });

  factory LessonChapter.fromJson(Object? raw) {
    final j = asMap(raw);
    final book = asMap(j['book']);
    return LessonChapter(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      order: asInt(j['order']) ?? 0,
      grade: asInt(j['grade']),
      bookName: studentBookName(book),
      bookKey: asStr(book['code']) ?? studentBookName(book),
      theoryCount: asInt(j['theoryCount']) ?? 0,
      videoCount: asInt(j['videoCount']) ?? 0,
      theoriesRead: asInt(j['theoriesRead']) ?? 0,
      videosWatched: asInt(j['videosWatched']) ?? 0,
      completed: asBool(j['completed']),
    );
  }

  final String id;
  final String title;
  final int order;
  final int? grade;
  final String bookName;
  final String bookKey;
  final int theoryCount;
  final int videoCount;
  final int theoriesRead;
  final int videosWatched;
  final bool completed;

  int get itemsTotal => theoryCount + videoCount;
  int get itemsDone => (theoriesRead > theoryCount ? theoryCount : theoriesRead) + (videosWatched > videoCount ? videoCount : videosWatched);

  /// 0..1 — серверийн тоололтоос (апп өөрөө дүгнэхгүй, зөвхөн харуулна).
  double get progress => itemsTotal == 0 ? 0 : itemsDone / itemsTotal;
}

/// Бүлгүүдийг номоор бүлэглэнэ (дарааллыг хадгална).
List<(String, List<LessonChapter>)> groupByBook(List<LessonChapter> chapters) {
  final map = <String, List<LessonChapter>>{};
  final names = <String, String>{};
  for (final c in chapters) {
    map.putIfAbsent(c.bookKey, () => []).add(c);
    names.putIfAbsent(c.bookKey, () => c.bookName);
  }
  return [for (final e in map.entries) (names[e.key] ?? '', e.value)];
}

@immutable
class TheoryBlock {
  const TheoryBlock({required this.id, required this.title, required this.content, this.imageKeys = const []});

  factory TheoryBlock.fromJson(Object? raw) {
    final j = asMap(raw);
    return TheoryBlock(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      content: asStr(j['content']) ?? '',
      imageKeys: [for (final k in asList(j['imageKeys'])) if (k is String && k.isNotEmpty) k],
    );
  }

  final String id;
  final String title;
  final String content;
  final List<String> imageKeys;
}

@immutable
class LessonVideo {
  const LessonVideo({required this.id, required this.title, required this.source, this.duration, this.embedUrl, this.unavailable = false});

  factory LessonVideo.fromJson(Object? raw) {
    final j = asMap(raw);
    final media = asMap(j['media']);
    return LessonVideo(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      source: asStr(j['url']) ?? asStr(j['s3Key']) ?? '',
      duration: asInt(j['duration']),
      embedUrl: asStr(media['embedUrl']),
      unavailable: asBool(j['unavailable']),
    );
  }

  final String id;
  final String title;

  /// Эх холбоос (`s3Key`).
  final String source;
  final int? duration;

  /// Сервер баталгаажуулсан YouTube nocookie embed (байвал).
  final String? embedUrl;
  final bool unavailable;
}

@immutable
class LessonTest {
  const LessonTest({required this.id, required this.title, this.problemCount});

  factory LessonTest.fromJson(Object? raw) {
    final j = asMap(raw);
    return LessonTest(id: asStr(j['id']) ?? '', title: asStr(j['title']) ?? '', problemCount: asInt(j['problemCount']));
  }

  final String id;
  final String title;
  final int? problemCount;
}

@immutable
class Lesson {
  const Lesson({
    required this.chapterId,
    required this.title,
    this.bookName = '',
    this.theories = const [],
    this.videos = const [],
    this.tests = const [],
    this.problemCount = 0,
    this.theoryRead = const {},
    this.videosWatched = const {},
  });

  factory Lesson.fromJson(Object? raw) {
    final j = asMap(raw);
    final ch = asMap(j['chapter']);
    final p = asMap(j['progress']);
    Set<String> ids(Object? v) => {for (final x in asList(v)) if (x is String) x};
    return Lesson(
      chapterId: asStr(ch['id']) ?? '',
      title: asStr(ch['title']) ?? '',
      bookName: studentBookName(ch['book']),
      theories: [for (final t in asList(j['theories'])) TheoryBlock.fromJson(t)],
      videos: [for (final v in asList(j['videos'])) LessonVideo.fromJson(v)],
      tests: [for (final t in asList(j['tests'])) LessonTest.fromJson(t)],
      problemCount: asInt(j['problemCount']) ?? 0,
      theoryRead: ids(p['theoryRead']),
      videosWatched: ids(p['videosWatched']),
    );
  }

  final String chapterId;
  final String title;
  final String bookName;
  final List<TheoryBlock> theories;
  final List<LessonVideo> videos;
  final List<LessonTest> tests;
  final int problemCount;
  final Set<String> theoryRead;
  final Set<String> videosWatched;
}

/// Видеотой бүлэг (`GET /videos/chapters`).
@immutable
class VideoChapter {
  const VideoChapter({required this.id, required this.title, this.bookName = '', this.videoCount = 0});

  factory VideoChapter.fromJson(Object? raw) {
    final j = asMap(raw);
    return VideoChapter(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      bookName: studentBookName(j['book']),
      videoCount: asInt(asMap(j['_count'])['videos']) ?? 0,
    );
  }

  final String id;
  final String title;
  final String bookName;
  final int videoCount;
}
