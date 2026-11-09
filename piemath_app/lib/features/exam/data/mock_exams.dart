import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/network_providers.dart';

/// Жишиг сорилын миний бүртгэл (`GET /mock-exams/my`) ба бүртгүүлэх/цуцлах
/// (`POST|DELETE /mock-exams/:id/register`). Нийтийн хуваарь — `books`-ийн `mockExamsProvider`.

enum MockRegStatus {
  notStarted,
  inProgress,
  submitted;

  static MockRegStatus parse(Object? v) => switch (v) {
        'IN_PROGRESS' => inProgress,
        'SUBMITTED' => submitted,
        _ => notStarted,
      };
}

@immutable
class MockRegistration {
  const MockRegistration({required this.eventId, required this.testId, required this.status, this.score, this.max});

  factory MockRegistration.fromJson(Map<String, Object?> j) => MockRegistration(
        eventId: j['eventId']! as String,
        testId: j['testId'] as String? ?? '',
        status: MockRegStatus.parse(j['status']),
        score: j['score'] as num?,
        max: j['max'] as num?,
      );

  final String eventId;
  final String testId;
  final MockRegStatus status;
  final num? score;
  final num? max;
}

final myMockRegistrationsProvider = FutureProvider.autoDispose<List<MockRegistration>>((ref) {
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(apiClientProvider).get(
        '/mock-exams/my',
        parse: (j) => [
          for (final r in ((j is Map ? j['registrations'] : null) as List?) ?? const [])
            if (r is Map) MockRegistration.fromJson(r.cast<String, Object?>()),
        ],
      );
});

Future<void> registerMockExam(WidgetRef ref, String eventId, {required bool on}) {
  final api = ref.read(apiClientProvider);
  final path = '/mock-exams/${Uri.encodeComponent(eventId)}/register';
  return on ? api.post<Object?>(path) : api.delete<Object?>(path);
}

/// «2 өдөр 5 цаг», «48 минут», «одоо» (вэбийн `fmtLeft`).
String mockTimeLeft(Duration d) {
  if (d <= Duration.zero) return 'одоо';
  final m = d.inMinutes, h = m ~/ 60, days = h ~/ 24;
  if (days >= 1) return h % 24 != 0 ? '$days өдөр ${h % 24} цаг' : '$days өдөр';
  if (h >= 1) return m % 60 != 0 ? '$h цаг ${m % 60} минут' : '$h цаг';
  return '${m < 1 ? 1 : m} минут';
}
