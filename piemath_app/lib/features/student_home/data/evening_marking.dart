import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';

/// Оройн тэмдэглэгээ (вэбийн `components/EveningMarking.tsx`): багш «ангид энэ тестийг хийсэн» гэж бүртгэмэгц
/// сурагч цаасаа хараад бодлого бүрийг нэг товчоор тэмдэглэнэ. `GET /me/todo-marking`, `POST /attempts/evening`.

/// Сурагчийн өөрийн үнэлгээ (API-ийн `SelfState`).
enum EveningState {
  solvedClean('SOLVED_CLEAN', 'Алдаагүй'),
  fixedAfterError('FIXED_AFTER_ERROR', 'Зассан'),
  failed('FAILED', 'Алдсан'),
  guessed('GUESSED', 'Буудсан');

  const EveningState(this.api, this.label);

  final String api;
  final String label;

  static EveningState? fromApi(Object? v) {
    for (final s in values) {
      if (s.api == v) return s;
    }
    return null;
  }
}

String _dateKey(Object? v) {
  final s = v is String ? v : '';
  return s.length >= 10 ? s.substring(0, 10) : s;
}

@immutable
class EveningProblem {
  const EveningProblem({required this.index, required this.problemId, this.statement, this.imageKey, this.myState});

  factory EveningProblem.fromJson(Map<String, Object?> m) => EveningProblem(
        index: (m['index'] as num?)?.toInt() ?? 0,
        problemId: m['problemId']! as String,
        statement: m['statementText'] is String && (m['statementText']! as String).trim().isNotEmpty
            ? m['statementText']! as String
            : null,
        imageKey: m['imageKey'] is String ? m['imageKey']! as String : null,
        myState: EveningState.fromApi(m['myState']),
      );

  final int index;
  final String problemId;
  final String? statement;
  final String? imageKey;
  final EveningState? myState;
}

@immutable
class EveningSession {
  const EveningSession({
    required this.sessionId,
    required this.date,
    required this.rawDate,
    required this.closesOn,
    required this.testTitle,
    required this.problems,
  });

  factory EveningSession.fromJson(Object? json) {
    final m = (json! as Map).cast<String, Object?>();
    final test = (m['test'] as Map?)?.cast<String, Object?>() ?? const {};
    return EveningSession(
      sessionId: m['sessionId']! as String,
      date: _dateKey(m['date']),
      rawDate: m['date'] is String ? m['date']! as String : '',
      closesOn: _dateKey(m['markingClosesOn']),
      testTitle: test['title'] is String ? test['title']! as String : 'Тест',
      problems: [
        for (final p in (m['problems'] as List?) ?? const [])
          if (p is Map) EveningProblem.fromJson(p.cast<String, Object?>()),
      ],
    );
  }

  final String sessionId;

  /// `YYYY-MM-DD` (харуулах).
  final String date;

  /// Серверийн огноо яг хэвээр — `POST /attempts/evening`-д буцааж илгээнэ (вэбтэй адил).
  final String rawDate;
  final String closesOn;
  final String testTitle;
  final List<EveningProblem> problems;
}

class EveningMarkingRepository {
  EveningMarkingRepository(this._api);

  final ApiClient _api;

  Future<List<EveningSession>> todo() => _api.get(
        '/me/todo-marking',
        parse: (j) => [for (final s in (j as List?) ?? const []) EveningSession.fromJson(s)],
      );

  /// Нэг бодлогын тэмдэглэгээ (давтахгүй — илгээх үйлдэл).
  Future<void> mark({required String date, required String problemId, required EveningState state}) => _api.post(
        '/attempts/evening',
        body: {
          'date': date,
          'entries': [
            {'problemId': problemId, 'selfState': state.api},
          ],
        },
      );
}

final eveningMarkingRepositoryProvider =
    Provider<EveningMarkingRepository>((ref) => EveningMarkingRepository(ref.watch(apiClientProvider)));

final eveningTodoProvider =
    FutureProvider.autoDispose<List<EveningSession>>((ref) => ref.watch(eveningMarkingRepositoryProvider).todo());
