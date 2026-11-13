import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme_mode.dart' show sharedPreferencesProvider;
import '../../../core/network/api_error.dart';
import '../data/homework_quiz.dart';
import 'board_controller.dart';

/// Онооны нүдний төлөв: хадгалж байна / хадгалагдсангүй / бичсэн нь 0..тоо биш. Байхгүй = хадгалагдсан.
enum QuizCell { saving, error, invalid }

enum QuizLoad { loading, ready, error }

/// Оноо бичигдсэнээс хойш хадгалах хүлээлт (вэбийн `SAVE_MS`).
const quizSaveDelay = Duration(milliseconds: 600);

/// Хадгалсны дараа самбарын эрсдэлийг (шалгуурын minQuiz) шинэчлэх хүлээлт (вэбийн 1,5 с).
const quizRefreshDelay = Duration(milliseconds: 1500);

@immutable
class QuizState {
  const QuizState({
    this.status = QuizLoad.loading,
    this.quiz,
    this.scores = const {},
    this.cells = const {},
    this.hidden = false,
    this.busy = false,
    this.lastError,
    this.saved = false,
  });

  final QuizLoad status;
  final QuizInfo? quiz;

  /// Одоогийн оноо (хадгалагдаж буйг оруулаад).
  final Map<String, num> scores;
  final Map<String, QuizCell> cells;

  /// Багш «Нуух» дарсан — оноо устахгүй, «Онлайн» нүд буцаж гарна.
  final bool hidden;
  final bool busy;
  final String? lastError;

  /// Энэ самбарт дор хаяж нэг оноо хадгалагдсан.
  final bool saved;

  /// Онооны талбар харагдах үед бодлогын тоо; шалгалтгүй эсвэл нуусан бол null.
  int? get max => quiz != null && !hidden ? quiz!.problemCount : null;

  /// Энэ өдрийн шалгалтын оноотой сурагчид — даалгаврыг шалгасанд тооцно (нуусан ч).
  Set<String> get scored => scores.keys.toSet();

  int _count(QuizCell c) => cells.values.where((v) => v == c).length;
  int get saving => _count(QuizCell.saving);
  int get failed => _count(QuizCell.error);
  int get invalid => _count(QuizCell.invalid);

  QuizState copyWith({
    QuizLoad? status,
    QuizInfo? quiz,
    bool clearQuiz = false,
    Map<String, num>? scores,
    Map<String, QuizCell>? cells,
    bool? hidden,
    bool? busy,
    String? lastError,
    bool? saved,
  }) => QuizState(
    status: status ?? this.status,
    quiz: clearQuiz ? null : (quiz ?? this.quiz),
    scores: scores ?? this.scores,
    cells: cells ?? this.cells,
    hidden: hidden ?? this.hidden,
    busy: busy ?? this.busy,
    lastError: lastError ?? this.lastError,
    saved: saved ?? this.saved,
  );
}

final homeworkQuizProvider = NotifierProvider.autoDispose.family<HomeworkQuizController, QuizState, BoardArgs>(
  HomeworkQuizController.new,
);

/// Нэг анги, нэг өдрийн шалгалт (вэбийн `useHomeworkQuiz`). Оноо бичигдэхэд өнгө, дундаж шууд;
/// хадгалалт сурагч бүрээр [quizSaveDelay]-ийн дараа (Enter/талбараас гарахад шууд). Нэг сурагчийн
/// хүсэлтүүд дараалж явна — хоцорч ирсэн хариу шинийг дарахгүй. Самбараас гарахад хүлээгдэж буйг илгээнэ.
class HomeworkQuizController extends Notifier<QuizState> {
  HomeworkQuizController(this.args);

  final BoardArgs args;

  late HomeworkQuizRepository _repo;
  final _timers = <String, Timer>{};
  final _chains = <String, Future<void>>{};

  /// Хадгалагдаагүй хамгийн сүүлийн утга (сурагч бүр).
  final _pending = <String, num?>{};
  Timer? _savedTimer;
  bool _disposed = false;

  @override
  QuizState build() {
    _repo = ref.read(homeworkQuizRepositoryProvider);
    ref.onDispose(() {
      _disposed = true;
      _savedTimer?.cancel();
      for (final id in [..._pending.keys]) {
        flush(id);
      }
      for (final t in _timers.values) {
        t.cancel();
      }
      _timers.clear();
    });
    scheduleMicrotask(_load);
    return const QuizState();
  }

  String _hiddenKey(String quizId) => 'hw_quiz_hidden:$quizId';

  bool _readHidden(String quizId) {
    try {
      return ref.read(sharedPreferencesProvider).getBool(_hiddenKey(quizId)) ?? false;
    } catch (_) {
      return false;
    }
  }

  void _writeHidden(String quizId, bool v) {
    try {
      unawaited(ref.read(sharedPreferencesProvider).setBool(_hiddenKey(quizId), v));
    } catch (_) {
      // хадгалах газаргүй (тест) — зөвхөн санах ойд
    }
  }

  void _apply(QuizPayload p) {
    state = state.copyWith(
      status: QuizLoad.ready,
      quiz: p.quiz,
      clearQuiz: p.quiz == null,
      scores: p.scores,
      cells: const {},
      hidden: p.quiz == null ? false : _readHidden(p.quiz!.id),
    );
  }

  Future<void> _load() async {
    try {
      final p = await _repo.get(args.classId, args.date);
      if (_disposed) return;
      _apply(p);
    } catch (_) {
      if (_disposed) return;
      state = state.copyWith(status: QuizLoad.error);
    }
  }

  Future<void> reload() async {
    state = state.copyWith(status: QuizLoad.loading);
    await _load();
  }

  void _setCell(String id, QuizCell? c) {
    if (state.cells[id] == c) return;
    final next = Map.of(state.cells);
    if (c == null) {
      next.remove(id);
    } else {
      next[id] = c;
    }
    state = state.copyWith(cells: next);
  }

  void _notifySaved() {
    _savedTimer?.cancel();
    _savedTimer = Timer(quizRefreshDelay, () {
      _savedTimer = null;
      if (_disposed) return;
      if (ref.exists(boardControllerProvider(args))) {
        unawaited(ref.read(boardControllerProvider(args).notifier).poll());
      }
    });
  }

  /// Нэг сурагчийн хүлээгдэж буй утгыг одоо илгээнэ (дараалалд).
  void flush(String id) {
    _timers.remove(id)?.cancel();
    if (!_pending.containsKey(id)) return;
    final value = _pending.remove(id);
    final prev = _chains[id] ?? Future<void>.value();
    final run = prev.then((_) async {
      try {
        await _repo.setScore(args.classId, id, args.date, value);
        if (_disposed) return;
        // Энэ хооронд дахин бичсэн бол «хадгалж байна» хэвээр.
        if (!_pending.containsKey(id)) _setCell(id, null);
        state = state.copyWith(saved: true);
        _notifySaved();
      } catch (e) {
        if (_disposed) return;
        _setCell(id, QuizCell.error);
        state = state.copyWith(lastError: _message(e, 'Хадгалж чадсангүй'));
      }
    });
    _chains[id] = run;
  }

  /// Оноо бичигдэх бүрт: өнгө, дундаж шууд; хадгалалт [quizSaveDelay]-ийн дараа ([now] бол шууд).
  void setScore(String id, num? value, {bool now = false}) {
    final cur = state.scores[id];
    if (cur != value) {
      final next = Map.of(state.scores);
      if (value == null) {
        next.remove(id);
      } else {
        next[id] = value;
      }
      state = state.copyWith(scores: next);
    }
    _pending[id] = value;
    _setCell(id, QuizCell.saving);
    _timers.remove(id)?.cancel();
    if (now) {
      flush(id);
    } else {
      _timers[id] = Timer(quizSaveDelay, () => flush(id));
    }
  }

  /// Бичсэн нь буруу (хадгалахгүй) эсвэл буцаж зөв болсон.
  void markInvalid(String id, bool invalid) {
    if (invalid) {
      _timers.remove(id)?.cancel();
      _pending.remove(id);
      _setCell(id, QuizCell.invalid);
    } else if (state.cells[id] == QuizCell.invalid) {
      _setCell(id, null);
    }
  }

  /// Эхлүүлэх эсвэл бодлогын тоог засах. Алдааг дуудагчид шиднэ (цонхонд харуулна).
  Future<void> setProblemCount(int n) async {
    state = state.copyWith(busy: true);
    try {
      final p = await _repo.setProblemCount(args.classId, args.date, n);
      if (_disposed) return;
      // Бичигдэж буй оноог дарахгүй.
      final next = Map.of(p.scores);
      for (final MapEntry(:key, :value) in _pending.entries) {
        if (value == null) {
          next.remove(key);
        } else {
          next[key] = value;
        }
      }
      if (p.quiz != null) _writeHidden(p.quiz!.id, false);
      state = state.copyWith(quiz: p.quiz, clearQuiz: p.quiz == null, scores: next, hidden: false);
      _notifySaved();
    } finally {
      if (!_disposed) state = state.copyWith(busy: false);
    }
  }

  /// Шалгалтыг устгах (оноо хамт, сервер зөөлөн).
  Future<void> remove() async {
    state = state.copyWith(busy: true);
    try {
      for (final t in _timers.values) {
        t.cancel();
      }
      _timers.clear();
      _pending.clear();
      await Future.wait([..._chains.values]);
      final p = await _repo.remove(args.classId, args.date);
      if (_disposed) return;
      _apply(p);
      _notifySaved();
    } finally {
      if (!_disposed) state = state.copyWith(busy: false);
    }
  }

  void setHidden(bool h) {
    final q = state.quiz;
    if (q != null) _writeHidden(q.id, h);
    state = state.copyWith(hidden: h);
  }
}

String _message(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;
