import '../data/homework_models.dart';

/// Гэрийн даалгаврын идэвхийн тоолуур (вэбийн `useActivityTracker`): апп нүдэнд харагдаж байсан хугацаа
/// (бодсон), апп-аас гарсан тоо ба хугацаа. Серверийн хадгалсан утгаас үргэлжилнэ (дахин нээхэд 0 болохгүй).
/// Юуг ч хориглохгүй, зөвхөн тоолно. Цэвэр класс — цагийг дуудагч өгнө (тестэд тогтмол).
class HomeworkActivityClock {
  HomeworkActivityClock(HwActivity seed, DateTime now)
      : _activeMs = seed.activeSec * 1000,
        _awayMs = seed.awaySec * 1000,
        _leaves = seed.leaveCount,
        _visibleSince = now;

  int _activeMs;
  int _awayMs;
  int _leaves;
  DateTime? _visibleSince;
  DateTime? _hiddenSince;

  /// Апп далд орлоо (өөр апп, түгжих дэлгэц).
  void hide(DateTime now) {
    final v = _visibleSince;
    if (v == null) return;
    _activeMs += now.difference(v).inMilliseconds.clamp(0, 1 << 31);
    _visibleSince = null;
    _hiddenSince = now;
    _leaves++;
  }

  /// Апп буцаж нүдэнд харагдлаа.
  void show(DateTime now) {
    final h = _hiddenSince;
    if (h == null) return;
    _awayMs += now.difference(h).inMilliseconds.clamp(0, 1 << 31);
    _hiddenSince = null;
    _visibleSince = now;
  }

  /// Одоогийн нийт (серверт илгээх).
  HwActivity snapshot(DateTime now) {
    final v = _visibleSince, h = _hiddenSince;
    final active = _activeMs + (v == null ? 0 : now.difference(v).inMilliseconds);
    final away = _awayMs + (h == null ? 0 : now.difference(h).inMilliseconds);
    return HwActivity(activeSec: active ~/ 1000, awaySec: away ~/ 1000, leaveCount: _leaves);
  }
}
