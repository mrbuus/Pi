import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/auth/session.dart';
import '../../../core/time/ub_time.dart';
import '../../exam/data/exam_models.dart' show TestRow;
import '../../exam/data/exam_repository.dart';
import '../data/weekly_goal_repository.dart';
import '../domain/study_plan.dart';

/// Төвийн «одоо» (УБ). Тестэд override.
final studyNowProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// Миний шалгалтууд (`GET /exam-results/my`) — ойрын шалгалтыг олоход.
final myExamsProvider = FutureProvider.autoDispose<List<TestRow>>((ref) => ref.watch(examRepositoryProvider).myExams());

/// Сурагчийн өөрөө тавьсан 7 хоногийн зорилго (1–7 өдөр) — серверт (`/study/weekly-goal`), зөвхөн өөрт нь.
///
/// Өмнө нь зөвхөн утсан дээр (`study.weekly_goal.<userId>`) хадгалдаг байсан: серверт зорилго байхгүй бол
/// утсан дээрх утгыг НЭГ удаа илгээж, амжилттай бол утасных арилна. Цаашид зөвхөн сервер.
class WeeklyGoalController extends AsyncNotifier<int?> {
  static const prefix = 'study.weekly_goal.';

  String get _key {
    final s = ref.read(sessionProvider);
    return '$prefix${s is SignedIn ? s.auth.userId : 'guest'}';
  }

  @override
  Future<int?> build() async {
    ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
    final repo = ref.read(weeklyGoalRepositoryProvider);
    final key = _key;
    SharedPreferences? prefs;
    int? local;
    try {
      prefs = await SharedPreferences.getInstance();
      final v = prefs.getInt(key);
      local = v == null ? null : clampWeeklyGoal(v);
    } catch (_) {}
    int? server;
    try {
      server = await repo.get();
    } catch (_) {
      // Сүлжээгүй: шилжээгүй утсан дээрх утга байвал түүгээр, үгүй бол картыг нуух (алдаа)
      if (local != null) return local;
      rethrow;
    }
    if (local == null) return server;
    if (server == null) {
      try {
        server = await repo.put(local);
      } catch (_) {
        return local; // дараагийн нээлтэд дахин шилжүүлнэ
      }
    }
    try {
      await prefs?.remove(key);
    } catch (_) {}
    return server;
  }

  /// null бол зорилгыг арилгана. Амжилтгүй бол өмнөх утга руу буцааж `false`.
  Future<bool> set(int? days) async {
    final v = days == null ? null : clampWeeklyGoal(days);
    final previous = state.value;
    state = AsyncData(v);
    try {
      final saved = await ref.read(weeklyGoalRepositoryProvider).put(v);
      if (ref.mounted) state = AsyncData(saved);
      return true;
    } catch (_) {
      if (ref.mounted) state = AsyncData(previous);
      return false;
    }
  }
}

final weeklyGoalProvider = AsyncNotifierProvider<WeeklyGoalController, int?>(WeeklyGoalController.new);
