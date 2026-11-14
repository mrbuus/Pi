import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';

/// Онолын (самбарын) зураг — `docs/api-contract/student-hub.md`.

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();
String? _str(Object? v) => v is String ? v : null;
int _int(Object? v) => v is num ? v.toInt() : 0;
List<String> _strings(Object? v) => [for (final x in (v as List?) ?? const []) if (x is String) x];
String _dateKey(Object? v) {
  final s = _str(v) ?? '';
  return s.length >= 10 ? s.substring(0, 10) : s;
}

/// `GET /student-hub/theory` мөр — нэг хичээлийн өдөр.
@immutable
class TheoryRow {
  const TheoryRow({
    required this.classroomId,
    required this.classroomName,
    required this.date,
    required this.topic,
    required this.tests,
    required this.count,
    required this.uploaders,
    required this.canUpload,
  });

  factory TheoryRow.fromJson(Object? json) {
    final m = _map(json);
    return TheoryRow(
      classroomId: m['classroomId']! as String,
      classroomName: _str(m['classroomName']) ?? '',
      date: _dateKey(m['date']),
      topic: _str(m['topic']),
      tests: _strings(m['tests']),
      count: _int(m['count']),
      uploaders: _strings(m['uploaders']),
      canUpload: m['canUpload'] == true,
    );
  }

  final String classroomId;
  final String classroomName;
  final String date;
  final String? topic;
  final List<String> tests;
  final int count;
  final List<String> uploaders;
  final bool canUpload;
}

/// Нэг илгээгчийн зургийн багц.
@immutable
class TheoryPhotoSet {
  const TheoryPhotoSet({
    required this.id,
    required this.uploaderName,
    required this.isMine,
    required this.isAssigned,
    required this.imageKeys,
    required this.pages,
    required this.createdAt,
  });

  factory TheoryPhotoSet.fromJson(Object? json) {
    final m = _map(json);
    return TheoryPhotoSet(
      id: m['id']! as String,
      uploaderName: _str(m['uploaderName']) ?? 'Сурагч',
      isMine: m['isMine'] == true,
      isAssigned: m['isAssigned'] == true,
      imageKeys: _strings(m['imageKeys']),
      pages: _int(m['pages']),
      createdAt: parseApiInstant(_str(m['createdAt'])),
    );
  }

  final String id;
  final String uploaderName;
  final bool isMine;
  final bool isAssigned;
  final List<String> imageKeys;
  final int pages;
  final DateTime? createdAt;
}

/// `GET /lesson-day/:classroomId/:date/photos`.
@immutable
class TheoryDay {
  const TheoryDay({
    required this.classroomId,
    required this.classroomName,
    required this.date,
    required this.upcoming,
    required this.topic,
    required this.tests,
    required this.assignedName,
    required this.assignedToMe,
    required this.canUpload,
    required this.photos,
  });

  factory TheoryDay.fromJson(Object? json) {
    final m = _map(json);
    final uploader = m['uploader'] is Map ? (m['uploader']! as Map).cast<String, Object?>() : null;
    return TheoryDay(
      classroomId: m['classroomId']! as String,
      classroomName: _str(m['classroomName']) ?? '',
      date: _dateKey(m['date']),
      upcoming: m['upcoming'] == true,
      topic: _str(m['topic']),
      tests: [
        for (final t in (m['tests'] as List?) ?? const [])
          if (t is Map) _str(t['title']) ?? '',
      ],
      assignedName: uploader == null ? null : _str(uploader['name']),
      assignedToMe: m['assignedToMe'] == true || uploader?['isMe'] == true,
      canUpload: m['canUpload'] == true,
      photos: [for (final p in (m['photos'] as List?) ?? const []) TheoryPhotoSet.fromJson(p)],
    );
  }

  final String classroomId;
  final String classroomName;
  final String date;
  final bool upcoming;
  final String? topic;
  final List<String> tests;

  /// Багшийн томилсон сурагчийн нэр.
  final String? assignedName;
  final bool assignedToMe;
  final bool canUpload;
  final List<TheoryPhotoSet> photos;

  TheoryPhotoSet? get mine {
    for (final p in photos) {
      if (p.isMine) return p;
    }
    return null;
  }
}
