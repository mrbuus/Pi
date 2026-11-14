import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../app/theme_mode.dart' show sharedPreferencesProvider;
import '../domain/answer.dart';

/// Серверт хараахан хүрээгүй хариу (офлайн) — апп хаагдсан ч алдагдахгүй.
class ExamDraft {
  const ExamDraft({this.answers = const {}, this.states = const {}});

  factory ExamDraft.fromJson(Object? raw) {
    if (raw is! Map) return const ExamDraft();
    final a = raw['answers'];
    final s = raw['states'];
    return ExamDraft(
      answers: {
        if (a is Map)
          for (final e in a.entries) e.key.toString(): normalizeAnswer(e.value),
      },
      states: {
        if (s is Map)
          for (final e in s.entries)
            if (e.value is String) e.key.toString(): e.value as String,
      },
    );
  }

  final Map<String, Object?> answers;
  final Map<String, String> states;

  bool get isEmpty => answers.isEmpty && states.isEmpty;

  Map<String, Object?> toJson() => {'answers': answers, 'states': states};
}

/// Илгээгээгүй хариуны локал хадгалалт.
///
/// Хариу нь хувийн мэдээлэл биш (бодлогын id → утга); хариуны түлхүүр, токен энд ХЭЗЭЭ Ч орохгүй.
/// Хэрэглэгч бүрээр түлхүүрлэнэ — нэг утсанд өөр хүн нэвтэрвэл холилдохгүй. Амжилттай хадгалмагц,
/// илгээмэгц устгана.
abstract class ExamDraftStore {
  Future<ExamDraft> read(String userId, String testId);
  Future<void> write(String userId, String testId, ExamDraft draft);
  Future<void> clear(String userId, String testId);
}

class PrefsExamDraftStore implements ExamDraftStore {
  const PrefsExamDraftStore(this._prefs);

  final SharedPreferences _prefs;

  /// Гарах (logout) үед бүх ноорог устгахад хэрэглэх угтвар.
  static const keyPrefix = 'exam_draft:';

  static String _key(String userId, String testId) => '$keyPrefix$userId:$testId';

  @override
  Future<ExamDraft> read(String userId, String testId) async {
    final raw = _prefs.getString(_key(userId, testId));
    if (raw == null) return const ExamDraft();
    try {
      return ExamDraft.fromJson(jsonDecode(raw));
    } catch (_) {
      await _prefs.remove(_key(userId, testId));
      return const ExamDraft();
    }
  }

  @override
  Future<void> write(String userId, String testId, ExamDraft draft) async {
    if (draft.isEmpty) {
      await _prefs.remove(_key(userId, testId));
    } else {
      await _prefs.setString(_key(userId, testId), jsonEncode(draft.toJson()));
    }
  }

  @override
  Future<void> clear(String userId, String testId) => _prefs.remove(_key(userId, testId));
}

/// Гарах (sign-out) үед ХЭРЭГЛЭГЧ БҮРИЙН илгээгээгүй шалгалтын ноорогийг төхөөрөмжөөс устгана
/// (`docs/SECURITY.md` §3). `SessionController.signOut`-оос дуудна. [prefs] өгөөгүй бол
/// `SharedPreferences.getInstance()`. Буцаах: устгасан түлхүүрийн тоо.
Future<int> clearExamDrafts([SharedPreferences? prefs]) async {
  final p = prefs ?? await SharedPreferences.getInstance();
  final keys = [
    for (final k in p.getKeys())
      if (k.startsWith(PrefsExamDraftStore.keyPrefix)) k,
  ];
  for (final k in keys) {
    await p.remove(k);
  }
  return keys.length;
}

/// Тестэд.
class MemoryExamDraftStore implements ExamDraftStore {
  final data = <String, ExamDraft>{};

  @override
  Future<ExamDraft> read(String userId, String testId) async => data['$userId:$testId'] ?? const ExamDraft();

  @override
  Future<void> write(String userId, String testId, ExamDraft draft) async {
    if (draft.isEmpty) {
      data.remove('$userId:$testId');
    } else {
      data['$userId:$testId'] = draft;
    }
  }

  @override
  Future<void> clear(String userId, String testId) async => data.remove('$userId:$testId');
}

final examDraftStoreProvider = Provider<ExamDraftStore>(
  (ref) => PrefsExamDraftStore(ref.watch(sharedPreferencesProvider)),
);
