import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../data/teacher_models.dart';
import '../data/teacher_repository.dart';
import '../domain/board_logic.dart';

/// Самбарын ачааллын төлөв.
enum BoardLoad { loading, ready, error }

/// Нэг анги, нэг өдрийн ирц/даалгаврын самбар (вэб `useBoard`).
@immutable
class BoardState {
  BoardState({
    this.status = BoardLoad.loading,
    this.loadError,
    this.payload,
    this.server = const ServerMarks(),
    this.overrides = const {},
    this.risk = const {},
    this.sent = const [],
    this.recordedBy,
    this.pending = 0,
    this.savedAt,
    this.saveError,
    this.bulkAtt = const [],
    this.bulkHw = const [],
    this.bulkBusy = false,
  });

  final BoardLoad status;
  final String? loadError;
  final BoardPayload? payload;
  final ServerMarks server;
  final Map<String, CellOverride> overrides;
  final Map<String, List<RiskFlag>> risk;
  final List<String> sent;
  final RecordedBy? recordedBy;

  /// Хадгалагдаж буй нүдний тоо.
  final int pending;

  /// Бүх хадгалалт дууссан сүүлийн цаг («15:32»).
  final String? savedAt;
  final String? saveError;

  /// «Бүгд ирсэн»/«Бүгд хийсэн»-ээр тэмдэглэсэн сурагчид — «Буцаах»-д.
  final List<String> bulkAtt;
  final List<String> bulkHw;
  final bool bulkBusy;

  List<String> get studentIds => [for (final s in payload?.students ?? const <BoardStudent>[]) s.id];

  /// Сурагч бүрийн бүртгэл (серверийн утга + хадгалагдаж буй түр утга).
  late final Map<String, DayRec> recs = {for (final id in studentIds) id: recordFor(id, server, overrides)};

  late final StatusCounts counts = dayCounts(studentIds, recs);

  /// Танхимын анги — Хийсэн/Дутуу/Хийгээгүй багана. Онлайн ангийн даалгавар тусдаа (апп доторх илгээлт).
  bool get homework => payload != null && !payload!.isOnline;

  BoardState copyWith({
    BoardLoad? status,
    String? loadError,
    BoardPayload? payload,
    ServerMarks? server,
    Map<String, CellOverride>? overrides,
    Map<String, List<RiskFlag>>? risk,
    List<String>? sent,
    RecordedBy? recordedBy,
    int? pending,
    String? savedAt,
    String? saveError,
    bool clearSaveError = false,
    List<String>? bulkAtt,
    List<String>? bulkHw,
    bool? bulkBusy,
  }) => BoardState(
    status: status ?? this.status,
    loadError: loadError ?? this.loadError,
    payload: payload ?? this.payload,
    server: server ?? this.server,
    overrides: overrides ?? this.overrides,
    risk: risk ?? this.risk,
    sent: sent ?? this.sent,
    recordedBy: recordedBy ?? this.recordedBy,
    pending: pending ?? this.pending,
    savedAt: savedAt ?? this.savedAt,
    saveError: clearSaveError ? null : (saveError ?? this.saveError),
    bulkAtt: bulkAtt ?? this.bulkAtt,
    bulkHw: bulkHw ?? this.bulkHw,
    bulkBusy: bulkBusy ?? this.bulkBusy,
  );
}

typedef BoardArgs = ({String classId, String date});

final boardControllerProvider = NotifierProvider.autoDispose.family<BoardController, BoardState, BoardArgs>(
  BoardController.new,
);

/// Товшилт бүр шууд хадгалагдана (optimistic): түр утга дэлгэцэнд шууд, серверийн хариугаар солигдоно,
/// амжилтгүй бол түр утгыг хаяж серверийн бодит төлөвийг харуулна (rollback). Нэг сурагчийн хадгалалтууд
/// дараалан явна (хариу сольж ирэхгүй). Харагдаж байх үед 15 сек тутам бусад багшийн өөрчлөлтийг авна.
class BoardController extends Notifier<BoardState> {
  BoardController(this.args);

  final BoardArgs args;

  late TeacherRepository _repo;
  final _pending = <String, int>{};
  final _typing = <String, ({Timer timer, void Function() send})>{};
  final _chains = <String, Future<void>>{};
  int _epoch = 0;
  Timer? _poll;
  Timer? _refresh;
  bool _active = true;
  bool _disposed = false;

  @override
  BoardState build() {
    _repo = ref.read(teacherRepositoryProvider);
    ref.onDispose(() {
      _disposed = true;
      _poll?.cancel();
      _refresh?.cancel();
      // Бичиж байсан тэмдэглэлийг алдахгүй — шууд илгээнэ.
      final pendingNotes = [..._typing.values];
      _typing.clear();
      for (final t in pendingNotes) {
        t.timer.cancel();
        t.send();
      }
    });
    scheduleMicrotask(_load);
    return BoardState();
  }

  // ───────── Ачаалах, шинэчлэх ─────────

  Future<void> reload() async {
    state = BoardState();
    await _load();
  }

  Future<void> _load() async {
    try {
      final p = await _repo.board(args.classId, args.date);
      if (_disposed) return;
      state = BoardState(
        status: BoardLoad.ready,
        payload: p,
        server: ServerMarks.of(attendance: p.attendance, homework: p.homework),
        risk: p.risk,
        sent: p.sent,
        recordedBy: p.recordedBy,
      );
      _startPolling();
    } catch (e) {
      if (_disposed) return;
      state = state.copyWith(status: BoardLoad.error, loadError: _message(e, 'Самбар нээгдсэнгүй'));
    }
  }

  /// Апп урд талд байгаа эсэх (`AppLifecycleState.resumed`). Ар талд poll хийхгүй.
  void setActive(bool active) {
    if (_active == active) return;
    _active = active;
    if (!active) {
      _poll?.cancel();
      _poll = null;
      return;
    }
    unawaited(poll());
    _startPolling();
  }

  void _startPolling() {
    if (!_active || _disposed || state.status != BoardLoad.ready) return;
    _poll ??= Timer.periodic(pollInterval, (_) => unawaited(poll()));
  }

  /// `GET …/marks` — хадгалагдаж буй өөрийн нүдийг дарахгүй (түр утга давхарласан хэвээр).
  Future<void> poll() async {
    if (_disposed || !_active || state.status != BoardLoad.ready) return;
    final at = _epoch;
    try {
      final p = await _repo.marks(args.classId, args.date);
      if (_disposed) return;
      var next = state.copyWith(risk: p.risk, sent: p.sent, recordedBy: p.recordedBy);
      // Нисэж байх хооронд манай хадгалалт дууссан бол хуучирсан — дараагийнхыг хүлээнэ.
      if (_epoch == at) {
        next = next.copyWith(server: ServerMarks.of(attendance: p.attendance, homework: p.homework));
      }
      state = next;
    } catch (_) {
      // сүлжээ тасарсан — дараагийн удаа
    }
  }

  void _refreshSoon() {
    _refresh?.cancel();
    _refresh = Timer(refreshDelay, () {
      _refresh = null;
      unawaited(poll());
    });
  }

  // ───────── Хадгалах дараалал ─────────

  DayRec current(String sid) => recordFor(sid, state.server, state.overrides);

  void _setOverrides(String sid, List<CellOverride> list) {
    state = state.copyWith(overrides: {...state.overrides, for (final o in list) cellKey(sid, o.cell): o});
  }

  int _bump(List<String> keys, int delta) {
    for (final k in keys) {
      final n = (_pending[k] ?? 0) + delta;
      if (n <= 0) {
        _pending.remove(k);
      } else {
        _pending[k] = n;
      }
    }
    return _pending.values.fold(0, (a, b) => a + b);
  }

  /// Хадгалагдаж дууссан нүдний түр утгыг арилгана (серверийн хариу аль хэдийн орсон).
  void _dropOverrides(List<String> keys) {
    final done = keys.where((k) => !_pending.containsKey(k) && !_typing.containsKey(k)).toSet();
    if (done.isEmpty) return;
    state = state.copyWith(overrides: Map.of(state.overrides)..removeWhere((k, _) => done.contains(k)));
  }

  Future<void> _run(List<String> sids, List<String> keys, Future<void> Function() fn, {bool counted = false}) {
    if (!counted) {
      final total = _bump(keys, 1);
      state = state.copyWith(pending: total, clearSaveError: true);
    }
    final prevs = [for (final s in sids) _chains[s] ?? Future<void>.value()];
    final task = Future.wait(prevs).then((_) async {
      try {
        await fn();
      } catch (e) {
        if (_disposed) return;
        _epoch++;
        final total = _bump(keys, -1);
        state = state.copyWith(pending: total, saveError: _message(e, 'Хадгалж чадсангүй'));
        _dropOverrides(keys);
        unawaited(poll());
        return;
      }
      if (_disposed) return;
      _epoch++;
      final total = _bump(keys, -1);
      state = state.copyWith(pending: total, savedAt: total == 0 ? DateMn.time(UbDateTime.now()) : null);
      if (total == 0) _refreshSoon();
      _dropOverrides(keys);
    });
    for (final s in sids) {
      _chains[s] = task;
    }
    return task;
  }

  Future<AttMarkResponse> _postAtt(List<Map<String, Object?>> entries) async {
    final res = await _repo.markAttendance(args.classId, args.date, entries);
    if (!_disposed) {
      state = state.copyWith(
        server: state.server.withAtt([for (final e in entries) e['studentId']! as String], res.rows),
      );
    }
    return res;
  }

  Future<void> _patchHw(String sid, Map<String, Object?> fields) async {
    final res = await _repo.patchHomework(args.classId, sid, args.date, fields);
    if (!_disposed) state = state.copyWith(server: state.server.withHw([sid], [res.toRow(sid)]));
  }

  // ───────── Товшилт ─────────

  void setAttendance(String sid, AttendanceStatus? v) {
    final plan = planAttendance(sid, current(sid), v);
    _setOverrides(sid, plan.overrides);
    if (state.bulkAtt.contains(sid)) state = state.copyWith(bulkAtt: [...state.bulkAtt]..remove(sid));
    unawaited(_run([sid], [for (final o in plan.overrides) cellKey(sid, o.cell)], () => _postAtt([plan.entry])));
  }

  void setLateRange(String sid, LateRange? r) {
    _setOverrides(sid, [AttOverride(AttendanceStatus.late, r)]);
    unawaited(
      _run(
        [sid],
        [cellKey(sid, Cell.att)],
        () => _postAtt([
          {'studentId': sid, 'status': AttendanceStatus.late.api, 'lateRange': r?.api},
        ]),
      ),
    );
  }

  void setHomework(String sid, HomeworkStatus? v) {
    final plan = planHomework(current(sid), v);
    _setOverrides(sid, plan.overrides);
    if (state.bulkHw.contains(sid)) state = state.copyWith(bulkHw: [...state.bulkHw]..remove(sid));
    unawaited(_run([sid], [for (final o in plan.overrides) cellKey(sid, o.cell)], () => _patchHw(sid, plan.fields)));
  }

  /// [typed] = гараар бичиж байна (зогссоны дараа хадгална); эс бөгөөс шалтгааны чип (шууд).
  void setNote(String sid, Cell cell, String text, {required bool typed}) {
    assert(cell == Cell.attNote || cell == Cell.hwNote);
    if (cell == Cell.attNote && current(sid).att == null) return;
    _setOverrides(sid, [if (cell == Cell.attNote) AttNoteOverride(text) else HwNoteOverride(text)]);
    final key = cellKey(sid, cell);
    void send() => unawaited(
      _run([sid], [key], () async {
        final body = noteValue(text);
        if (cell == Cell.attNote) {
          await _postAtt([
            {'studentId': sid, 'note': body},
          ]);
        } else {
          await _patchHw(sid, {'comment': body});
        }
      }, counted: true),
    );
    final prev = _typing.remove(key);
    if (prev != null) {
      prev.timer.cancel();
    } else {
      state = state.copyWith(pending: _bump([key], 1), clearSaveError: true);
    }
    if (!typed) {
      send();
      return;
    }
    _typing[key] = (
      timer: Timer(typingDelay, () {
        _typing.remove(key);
        send();
      }),
      send: send,
    );
  }

  /// Бичиж байсан тэмдэглэлийг хүлээлгүй илгээнэ (sheet хаахад).
  void flushNotes() {
    final list = [..._typing.values];
    _typing.clear();
    for (final t in list) {
      t.timer.cancel();
      t.send();
    }
  }

  // ───────── Бөөнөөр: зөвхөн тэмдэглээгүй нүд ─────────

  Future<void> markAllPresent() async {
    final ids = bulkPresentCandidates(state.studentIds, state.recs);
    if (ids.isEmpty || state.bulkBusy) return;
    state = state.copyWith(bulkBusy: true);
    for (final id in ids) {
      _setOverrides(id, const [AttOverride(AttendanceStatus.present, null)]);
    }
    var applied = <String>[];
    await _run(ids, [for (final id in ids) cellKey(id, Cell.att)], () async {
      final res = await _postAtt([
        for (final id in ids) {'studentId': id, 'status': AttendanceStatus.present.api, 'onlyIf': 'UNMARKED'},
      ]);
      applied = res.applied;
    });
    if (!_disposed) state = state.copyWith(bulkBusy: false, bulkAtt: applied);
  }

  /// «Буцаах» — зөвхөн одоо ч «Ирсэн» хэвээр байгааг цэвэрлэнэ (`onlyIf: PRESENT`).
  Future<void> undoAllPresent() async {
    final ids = [...state.bulkAtt];
    if (ids.isEmpty || state.bulkBusy) return;
    state = state.copyWith(bulkBusy: true);
    for (final id in ids) {
      _setOverrides(id, const [AttOverride(null, null)]);
    }
    await _run(ids, [for (final id in ids) cellKey(id, Cell.att)], () async {
      await _postAtt([
        for (final id in ids) {'studentId': id, 'status': null, 'onlyIf': AttendanceStatus.present.api},
      ]);
    });
    if (!_disposed) state = state.copyWith(bulkBusy: false, bulkAtt: const []);
  }

  /// [quizScored] — энэ өдрийн шалгалтын оноотой сурагчид (даалгаврыг нь шалгасан тул алгасна).
  Future<void> markAllDone({Set<String> quizScored = const {}}) async {
    final ids = bulkDoneCandidates(state.studentIds, state.recs, quizScored: quizScored);
    if (ids.isEmpty || state.bulkBusy) return;
    await _bulkHw(ids, HomeworkStatus.done, 'UNMARKED', undo: false);
  }

  Future<void> undoAllDone() async {
    final ids = [...state.bulkHw];
    if (ids.isEmpty || state.bulkBusy) return;
    await _bulkHw(ids, null, HomeworkStatus.done.api, undo: true);
  }

  Future<void> _bulkHw(List<String> ids, HomeworkStatus? v, String onlyIf, {required bool undo}) async {
    state = state.copyWith(bulkBusy: true);
    for (final id in ids) {
      _setOverrides(id, [HwOverride(v)]);
    }
    var applied = <String>[];
    await _run(ids, [for (final id in ids) cellKey(id, Cell.hw)], () async {
      final res = await _repo.bulkHomework(args.classId, args.date, [
        for (final id in ids) {'studentId': id, 'status': v?.api, 'onlyIf': onlyIf},
      ]);
      if (!_disposed) state = state.copyWith(server: state.server.withHw(ids, res.rows));
      applied = res.applied;
    });
    if (!_disposed) state = state.copyWith(bulkBusy: false, bulkHw: undo ? const [] : applied);
  }
}

String _message(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;
