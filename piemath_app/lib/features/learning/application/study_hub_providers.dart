import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/auth/session.dart';
import '../../../core/time/ub_time.dart';
import '../../exam/data/exam_models.dart' show TestRow;
import '../../exam/data/exam_repository.dart';
import '../domain/study_plan.dart';

/// Төвийн «одоо» (УБ). Тестэд override.
final studyNowProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// Миний шалгалтууд (`GET /exam-results/my`) — ойрын шалгалтыг олоход.
final myExamsProvider = FutureProvider.autoDispose<List<TestRow>>((ref) => ref.watch(examRepositoryProvider).myExams());

/// Сурагчийн өөрөө тавьсан 7 хоногийн зорилго (1–7 өдөр). API байхгүй тул зөвхөн энэ утсан дээр
/// (SharedPreferences, хэрэглэгч бүрээр). Хэнд ч харагдахгүй, бусадтай харьцуулахгүй.
class WeeklyGoalController extends AsyncNotifier<int?> {
  static const prefix = 'study.weekly_goal.';

  String get _key {
    final s = ref.read(sessionProvider);
    return '$prefix${s is SignedIn ? s.auth.userId : 'guest'}';
  }

  @override
  Future<int?> build() async {
    ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
    try {
      final v = (await SharedPreferences.getInstance()).getInt(_key);
      return v == null ? null : clampWeeklyGoal(v);
    } catch (_) {
      return null;
    }
  }

  /// null бол зорилгыг арилгана.
  Future<void> set(int? days) async {
    final v = days == null ? null : clampWeeklyGoal(days);
    state = AsyncData(v);
    try {
      final p = await SharedPreferences.getInstance();
      if (v == null) {
        await p.remove(_key);
      } else {
        await p.setInt(_key, v);
      }
    } catch (_) {}
  }
}

final weeklyGoalProvider = AsyncNotifierProvider<WeeklyGoalController, int?>(WeeklyGoalController.new);
