import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../data/makeup_visits.dart';
import '../data/teacher_models.dart';
import '../domain/board_logic.dart';

/// Хоёр багш зэрэг ажиллах үед серверээс шинэчлэх давтамж (вэбийн `POLL_MS`).
const visitsPollInterval = Duration(seconds: 20);

typedef VisitsArgs = ({String place, String date});

@immutable
class VisitsState {
  const VisitsState({this.visits, this.error, this.saveError});

  /// null = ачаалж байна.
  final List<VisitView>? visits;
  final String? error;

  /// Сүүлийн хадгалалтын алдаа (snackbar-д нэг удаа).
  final String? saveError;

  VisitsState copyWith({List<VisitView>? visits, String? error, bool clearError = false, String? saveError}) =>
      VisitsState(
        visits: visits ?? this.visits,
        error: clearError ? null : (error ?? this.error),
        saveError: saveError,
      );
}

final visitsProvider = NotifierProvider.autoDispose.family<VisitsController, VisitsState, VisitsArgs>(
  VisitsController.new,
);

/// Бичиж буй бичвэр сервер таслаж (trim) буцаасан ижил утгаар солигдохгүй — курсор алдагдахгүй.
String? _keepTyped(String? local, String? server) => (local ?? '').trim() == (server ?? '') ? local : server;

VisitView _merge(VisitView? local, VisitView server) {
  if (local == null) return server;
  final comment = _keepTyped(local.comment, server.comment);
  final attNote = _keepTyped(local.attNote, server.attNote);
  final hwNote = _keepTyped(local.hwNote, server.hwNote);
  return server.copyWith(
    comment: comment,
    attNote: attNote,
    clearAttNote: attNote == null,
    hwNote: hwNote,
    clearHwNote: hwNote == null,
  );
}

/// Нэг газрын (зочилсон анги эсвэл 406) тэр өдрийн нөхөлтүүд (вэбийн `useVisits`): ачаалах, 20 сек
/// тутам шинэчлэх, засварыг дараалуулан хадгалах (хариу сольж ирэхгүй), бичиж буй тэмдэглэлийг
/// зогссоны дараа илгээх. Хадгалалт амжилтгүй бол серверээс дахин уншина.
class VisitsController extends Notifier<VisitsState> {
  VisitsController(this.args);

  final VisitsArgs args;

  late MakeupVisitsRepository _repo;
  int _pending = 0;
  final _chains = <String, Future<void>>{};
  final _typing = <String, ({Timer timer, void Function() send})>{};
  Timer? _poll;
  bool _disposed = false;

  @override
  VisitsState build() {
    _repo = ref.read(makeupVisitsRepositoryProvider);
    ref.onDispose(() {
      _disposed = true;
      _poll?.cancel();
      // Гарахад бичиж байсныг алдахгүй — шууд илгээнэ.
      final list = [..._typing.values];
      _typing.clear();
      for (final t in list) {
        t.timer.cancel();
        t.send();
      }
    });
    scheduleMicrotask(load);
    _poll = Timer.periodic(visitsPollInterval, (_) => unawaited(load()));
    return const VisitsState();
  }

  Future<void> load() async {
    try {
      final rows = await _repo.list(args.place, args.date);
      // Хадгалж байх үед ирсэн хариу хуучирсан байж болно — дараагийн удаа.
      if (_disposed || _pending > 0 || _typing.isNotEmpty) return;
      state = VisitsState(visits: rows);
    } catch (e) {
      if (_disposed) return;
      state = state.copyWith(error: _message(e, 'Ачаалж чадсангүй'));
    }
  }

  Future<void> reload() async {
    state = state.copyWith(clearError: true);
    await load();
  }

  VisitView? byId(String id) => state.visits?.where((v) => v.id == id).firstOrNull;

  /// Түр (optimistic) өөрчлөлт — сервер хариулахад жинхэнэ мөрөөр солигдоно.
  void patchLocal(String id, VisitView Function(VisitView) fn) {
    final list = state.visits;
    if (list == null) return;
    state = state.copyWith(visits: [for (final v in list) v.id == id ? fn(v) : v]);
  }

  void replace(List<VisitView> rows) {
    final list = state.visits;
    if (list == null) return;
    final by = {for (final r in rows) r.id: r};
    state = state.copyWith(visits: [for (final v in list) by.containsKey(v.id) ? _merge(v, by[v.id]!) : v]);
  }

  void add(List<VisitView> rows) {
    final list = state.visits ?? const <VisitView>[];
    final have = {for (final v in list) v.id};
    state = state.copyWith(visits: [...list, ...rows.where((r) => !have.contains(r.id))]);
  }

  void removeLocal(String id) {
    final list = state.visits;
    if (list == null) return;
    state = state.copyWith(
      visits: [
        for (final v in list)
          if (v.id != id) v,
      ],
    );
  }

  /// Нэг нөхөлтийн хадгалалтуудыг дараалуулна.
  Future<void> save(String id, Map<String, Object?> body) {
    _pending++;
    final prev = _chains[id] ?? Future<void>.value();
    final task = prev.then((_) async {
      try {
        final row = await _repo.update(id, body);
        if (!_disposed) replace([row]);
      } catch (e) {
        if (!_disposed) {
          state = state.copyWith(saveError: _message(e, 'Хадгалж чадсангүй'));
          scheduleMicrotask(() {
            if (!_disposed) unawaited(load());
          });
        }
      } finally {
        _pending--;
      }
    });
    _chains[id] = task;
    return task;
  }

  /// Бичиж байх үед: зогссоны дараа нэг л хүсэлт.
  void saveTyped(String id, String field, String? value) {
    final k = '$id|$field';
    _typing.remove(k)?.timer.cancel();
    void send() {
      _typing.remove(k);
      unawaited(save(id, {field: value}));
    }

    _typing[k] = (timer: Timer(typingDelay, send), send: send);
  }

  /// Бичиж байсныг хүлээлгүй илгээнэ (хуудас хаахад).
  void flushTyped() {
    final list = [..._typing.values];
    _typing.clear();
    for (final t in list) {
      t.timer.cancel();
      t.send();
    }
  }

  // ───────── Самбарын дүрэм (вэбийн `GuestSection`) ─────────

  /// Ирцийг арилгавал тэмдэглэл хамт; тасалсан/чөлөөтэй биш болбол шалтгааны чип арилна.
  void setAtt(String id, AttendanceStatus? v) {
    final visit = byId(id);
    if (visit == null) return;
    final note = visit.attNote ?? '';
    final clearNote =
        v == null ||
        (v != AttendanceStatus.absent &&
            v != AttendanceStatus.excused &&
            (isReason(note, absenceReasons) || isReason(note, excusedReasons)));
    patchLocal(
      id,
      (x) =>
          x.copyWith(att: v, clearAtt: v == null, clearLateRange: v != AttendanceStatus.late, clearAttNote: clearNote),
    );
    unawaited(save(id, {'attStatus': v?.api, if (clearNote && v != null && note.isNotEmpty) 'attNote': null}));
  }

  void setLateRange(String id, LateRange? r) {
    patchLocal(id, (x) => x.copyWith(att: AttendanceStatus.late, lateRange: r, clearLateRange: r == null));
    unawaited(save(id, {'attStatus': AttendanceStatus.late.api, 'lateRange': r?.api}));
  }

  void setAttNote(String id, String text, {required bool typed}) {
    final visit = byId(id);
    if (visit == null || visit.att == null) return;
    patchLocal(id, (x) => x.copyWith(attNote: text));
    final value = text.trim().isEmpty ? null : text;
    if (typed) {
      saveTyped(id, 'attNote', value);
    } else {
      unawaited(save(id, {'attNote': value}));
    }
  }

  void setHw(String id, HomeworkStatus? v) {
    final visit = byId(id);
    if (visit == null) return;
    final clear =
        v != HomeworkStatus.partial && v != HomeworkStatus.notDone && isReason(visit.hwNote ?? '', homeworkReasons);
    patchLocal(id, (x) => x.copyWith(hw: v, clearHw: v == null, clearHwNote: clear));
    unawaited(save(id, {'hwStatus': v?.api, if (clear) 'hwNote': null}));
  }

  void setHwNote(String id, String text, {required bool typed}) {
    if (byId(id) == null) return;
    patchLocal(id, (x) => x.copyWith(hwNote: text));
    final value = text.trim().isEmpty ? null : text;
    if (typed) {
      saveTyped(id, 'hwNote', value);
    } else {
      unawaited(save(id, {'hwNote': value}));
    }
  }

  /// 406: тайлбар (500 тэмдэгт хүртэл).
  void setComment(String id, String text) {
    patchLocal(id, (x) => x.copyWith(comment: text));
    saveTyped(id, 'comment', text.trim().isEmpty ? null : text);
  }

  /// Жагсаалтаас хасах (сервер зөөлөн устгана). Алдаа бол дахин уншаад алдааг шиднэ.
  Future<void> remove(String id) async {
    removeLocal(id);
    try {
      await _repo.remove(id);
    } catch (_) {
      unawaited(load());
      rethrow;
    }
  }
}

String _message(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;
