import 'package:flutter/foundation.dart';

import 'json.dart';

/// Бодлогын сан (`/app/library`, вэбийн `app/library/page.tsx`): хичээл → ном → сэдэв → тест → бодлого.

enum LibrarySubject {
  math('MATH', 'Математик'),
  social('SOCIAL_STUDIES', 'Нийгмийн ухаан');

  const LibrarySubject(this.api, this.label);

  final String api;
  final String label;
}

/// `GET /books?subject=` — сурагчид API зөвхөн харагдах номыг өгнө.
@immutable
class LibraryBook {
  const LibraryBook({
    required this.id,
    required this.code,
    required this.title,
    this.displayName,
    this.displayOrder,
    this.problemCount = 0,
    this.testCount = 0,
    this.chapterCount = 0,
  });

  factory LibraryBook.fromJson(Object? raw) {
    final j = asMap(raw);
    final dn = asStr(j['displayName'])?.trim();
    return LibraryBook(
      id: asStr(j['id']) ?? '',
      code: asStr(j['code']) ?? '',
      title: asStr(j['title']) ?? '',
      displayName: dn == null || dn.isEmpty ? null : dn,
      displayOrder: asInt(j['displayOrder']),
      problemCount: asInt(j['problemCount']) ?? 0,
      testCount: asInt(j['testCount']) ?? 0,
      chapterCount: asInt(asMap(j['_count'])['chapters']) ?? 0,
    );
  }

  final String id;
  final String code;
  final String title;

  /// Сурагчид харагдах нэр («Е-1»). Дотоод нэр («100x100», «V3») хэзээ ч харагдахгүй.
  final String? displayName;
  final int? displayOrder;
  final int problemCount;
  final int testCount;
  final int chapterCount;

  String get label => displayName ?? title;

  /// Бүтэцгүй (бүлэг, бодлогогүй) ном жагсаалтад орохгүй.
  bool get hasContent => chapterCount > 0 || problemCount > 0;
}

/// Анхдагч ном: API-ийн дарааллын эхнийх (displayOrder-той), эс бөгөөс эхнийх.
LibraryBook? defaultBook(List<LibraryBook> books) {
  for (final b in books) {
    if (b.displayOrder != null) return b;
  }
  return books.isEmpty ? null : books.first;
}

/// `GET /chapters?bookId=` — нэг тест (бүлэг). Гарчиг «Сэдэв, дунд цэг, Тест 1» хэлбэртэй.
@immutable
class LibraryChapter {
  const LibraryChapter({
    required this.id,
    required this.title,
    this.order = 0,
    this.freePreview = false,
    this.problems = 0,
    this.theories = 0,
    this.tests = 0,
    this.access,
    this.accessibleProblems,
  });

  factory LibraryChapter.fromJson(Object? raw) {
    final j = asMap(raw);
    final count = asMap(j['_count']);
    return LibraryChapter(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      order: asInt(j['order']) ?? 0,
      freePreview: asBool(j['freePreview']),
      problems: asInt(count['problems']) ?? 0,
      theories: asInt(count['theories']) ?? 0,
      tests: asInt(count['tests']) ?? 0,
      access: asStr(j['access']),
      accessibleProblems: asInt(j['accessibleProblems']),
    );
  }

  final String id;
  final String title;
  final int order;
  final bool freePreview;
  final int problems;
  final int theories;
  final int tests;

  /// Танхимын сурагчид: `full` эсвэл `released` (ангид нээгдсэн тестийнх). Бусдад null.
  final String? access;
  final int? accessibleProblems;

  /// Сурагчид харагдах бодлогын тоо.
  int get visibleProblems => accessibleProblems ?? problems;

  ({String topic, String label}) get parts => splitChapterTitle(title);
}

/// «Сэдэв, дунд цэг, Тест 1» → (сэдэв, шошго) (вэбийн `lib/topicSymbols.splitChapterTitle`).
({String topic, String label}) splitChapterTitle(String title) {
  final parts = title.split(' \u00B7 ');
  final topic = parts.first.trim();
  final rest = parts.skip(1).join(' \u00B7 ').trim();
  return (topic: topic.isEmpty ? title : topic, label: rest.isEmpty ? title : rest);
}

/// Нэг сэдэв ба түүний тестүүд.
@immutable
class TopicGroup {
  const TopicGroup({
    required this.topic,
    required this.chapters,
    required this.problems,
    required this.theories,
    required this.free,
    this.testNo,
  });

  final String topic;

  /// Номын хэмжээний тестийн дугаар (Хавтгай 1: сэдэв бүр «Тест N»), эс бөгөөс null.
  final int? testNo;
  final List<LibraryChapter> chapters;
  final int problems;
  final int theories;
  final int free;

  String get name => testNo != null ? 'Тест $testNo — $topic' : topic;
}

/// Тестүүдийг сэдвээр бүлэглэнэ (API-ийн дарааллаар), сэдэв доторх тестийг `order`-оор.
List<TopicGroup> groupChapters(List<LibraryChapter> chapters) {
  final order = <String>[];
  final byTopic = <String, List<LibraryChapter>>{};
  for (final c in chapters) {
    final t = c.parts.topic;
    byTopic.putIfAbsent(t, () {
      order.add(t);
      return <LibraryChapter>[];
    }).add(c);
  }
  int? testNoOf(List<LibraryChapter> list) {
    if (list.length != 1) return null;
    final m = RegExp(r'^Тест\s+(\d+)$').firstMatch(list.first.parts.label);
    return m == null ? null : int.parse(m.group(1)!);
  }

  final nos = [for (final t in order) testNoOf(byTopic[t]!)];
  // «Тест N» ном даяар давхардахгүй бол л (Хавтгай 1) — 100x100-д сэдэв бүрт «Тест 1» давтагддаг
  final bookWide = nos.length > 1 && nos.every((n) => n != null) && nos.toSet().length == nos.length;
  return [
    for (final (i, t) in order.indexed)
      TopicGroup(
        topic: t,
        testNo: bookWide ? nos[i] : null,
        chapters: [...byTopic[t]!]..sort((a, b) => a.order.compareTo(b.order)),
        problems: byTopic[t]!.fold(0, (s, c) => s + c.visibleProblems),
        theories: byTopic[t]!.fold(0, (s, c) => s + c.theories),
        free: byTopic[t]!.where((c) => c.freePreview).length,
      ),
  ];
}
