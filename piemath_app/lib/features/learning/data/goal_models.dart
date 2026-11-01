import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';
import 'json.dart';

/// Зорилгын төлөв (`TaskStatus`). Төлөв зөвхөн өнгөөр биш, дүрс + нэрээр ялгагдана.
enum GoalStatus {
  planned('PLANNED', 'Төлөвлөсөн'),
  inProgress('IN_PROGRESS', 'Хийгдэж байгаа'),
  done('DONE', 'Биелсэн'),
  blocked('BLOCKED', 'Саатсан'),
  cancelled('CANCELLED', 'Цуцалсан');

  const GoalStatus(this.wire, this.label);

  final String wire;
  final String label;

  /// Идэвхтэй (дуусаагүй) төлөв үү.
  bool get isActive => this == planned || this == inProgress || this == blocked;

  static GoalStatus parse(Object? v) {
    for (final s in values) {
      if (s.wire == v) return s;
    }
    return planned;
  }
}

/// Зорилгын хичээл (`Subject`).
enum GoalSubject {
  math('MATH', 'Математик'),
  social('SOCIAL_STUDIES', 'Нийгмийн ухаан'),
  sat('SAT', 'SAT');

  const GoalSubject(this.wire, this.label);

  final String wire;
  final String label;

  static GoalSubject? parse(Object? v) {
    for (final s in values) {
      if (s.wire == v) return s;
    }
    return null;
  }
}

@immutable
class Goal {
  const Goal({
    required this.id,
    required this.title,
    required this.status,
    this.description,
    this.targetDate,
    this.subject,
  });

  factory Goal.fromJson(Object? raw) {
    final j = asMap(raw);
    final at = parseApiInstant(asStr(j['targetDate']));
    final desc = asStr(j['description']);
    return Goal(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      description: desc == null || desc.trim().isEmpty ? null : desc,
      targetDate: at == null ? null : UbDateTime.fromInstant(at).startOfDay,
      status: GoalStatus.parse(j['status']),
      subject: GoalSubject.parse(j['subject']),
    );
  }

  final String id;
  final String title;
  final String? description;

  /// Зорилтот өдөр (УБ-ын хуанлийн өдөр).
  final UbDateTime? targetDate;
  final GoalStatus status;
  final GoalSubject? subject;
}

/// Идэвхтэй зорилгуудыг огноотой нь түрүүлж (ойрхон нь эхэнд), огноогүйг сүүлд нь эрэмбэлнэ.
List<Goal> sortGoals(Iterable<Goal> goals) {
  final list = goals.toList();
  list.sort((a, b) {
    final x = a.targetDate;
    final y = b.targetDate;
    if (x == null && y == null) return 0;
    if (x == null) return 1;
    if (y == null) return -1;
    return x.compareTo(y);
  });
  return list;
}
