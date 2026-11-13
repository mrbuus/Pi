import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../data/class_checks.dart';

@immutable
class ChecksState {
  const ChecksState({this.data, this.error, this.saving = const {}, this.markError});

  /// null = ачаалж байна.
  final ClassChecksData? data;
  final String? error;

  /// Хадгалагдаж буй `checkId:studentId`.
  final Set<String> saving;

  /// Сүүлийн тэмдэглэгээний алдаа (snackbar-д нэг удаа).
  final String? markError;

  ClassCheck? find(String id) {
    final d = data;
    if (d == null) return null;
    return [...d.checks, ...d.archived].where((c) => c.id == id).firstOrNull;
  }

  ChecksState copyWith({
    ClassChecksData? data,
    String? error,
    bool clearError = false,
    Set<String>? saving,
    String? markError,
  }) => ChecksState(
    data: data ?? this.data,
    error: clearError ? null : (error ?? this.error),
    saving: saving ?? this.saving,
    markError: markError,
  );
}

final classChecksProvider = NotifierProvider.autoDispose.family<ChecksController, ChecksState, String>(
  ChecksController.new,
);

/// «Чек» (вэбийн `ClassChecksPanel`): дарах бүрд шууд хадгална (optimistic, алдаа гарвал буцаана).
/// Нэг сурагчийн дараалсан даралт дарааллаараа илгээгдэнэ; сервер (checkId, studentId)-аар upsert.
/// Тэмдэглэгээ алдаатай бол бүх даралт дуусмагц серверээс дахин уншина; арын шинэчлэл хадгалж буй
/// даралтын optimistic төлөвийг дарахгүй.
class ChecksController extends Notifier<ChecksState> {
  ChecksController(this.classId);

  final String classId;

  late ClassChecksRepository _repo;
  final _queue = <String, Future<void>>{};
  final _seq = <String, int>{};
  final _confirmed = <String, CheckMark?>{};
  int _inflight = 0;
  bool _resync = false;
  bool _disposed = false;

  @override
  ChecksState build() {
    _repo = ref.read(classChecksRepositoryProvider);
    ref.onDispose(() => _disposed = true);
    scheduleMicrotask(load);
    return const ChecksState();
  }

  /// [quiet] = арын шинэчлэл: хадгалж буй даралт байвал хариуг хаяна.
  Future<void> load({bool quiet = false}) async {
    if (!quiet) state = state.copyWith(clearError: true);
    try {
      final res = await _repo.list(classId);
      if (_disposed || (quiet && _inflight > 0)) return;
      state = state.copyWith(data: res);
    } catch (e) {
      if (_disposed || quiet) return;
      state = state.copyWith(error: _message(e, 'Чекүүдийг ачаалж чадсангүй'));
    }
  }

  void _updateCheck(String id, ClassCheck Function(ClassCheck) fn) {
    final d = state.data;
    if (d == null) return;
    state = state.copyWith(
      data: d.copyWith(
        checks: [for (final c in d.checks) c.id == id ? fn(c) : c],
        archived: [for (final c in d.archived) c.id == id ? fn(c) : c],
      ),
    );
  }

  void _markSaving(String key, bool on) {
    if (state.saving.contains(key) == on) return;
    final next = {...state.saving};
    on ? next.add(key) : next.remove(key);
    state = state.copyWith(saving: next);
  }

  /// Тэмдэглэх. [body] — `{checked, skipped?, amount?, collectedById?, note?}`.
  void mark(String checkId, String studentId, Map<String, Object?> body) {
    final check = state.find(checkId);
    if (check == null) return;
    final key = '$checkId:$studentId';
    final current = check.markOf(studentId);
    final next = body['checked'] == true;
    _confirmed.putIfAbsent(key, () => current);
    final n = (_seq[key] ?? 0) + 1;
    _seq[key] = n;
    _inflight++;
    _markSaving(key, true);
    // Номын чек: сервер хариулах хүртэл дүн, төлөвийг урьдчилан харуулна.
    _updateCheck(
      checkId,
      (c) => c.withMark(
        studentId,
        CheckMark(
          studentId: studentId,
          checked: next,
          updatedAt: DateTime.now().toUtc().toIso8601String(),
          updatedBy: current?.updatedBy,
          skipped: check.isBook && body['skipped'] == true,
          amount: check.isBook && next ? ((body['amount'] as num?)?.toInt() ?? check.amount) : null,
          collectedBy: check.isBook && next ? current?.collectedBy : null,
          note: check.isBook ? body['note'] as String? : null,
        ),
      ),
    );
    Future<void> send() async {
      try {
        final saved = await _repo.setMark(classId, checkId, studentId, body);
        if (_disposed) return;
        if (_seq[key] != n) {
          _confirmed[key] = saved;
          return;
        }
        _confirmed.remove(key);
        _updateCheck(checkId, (c) => c.withMark(studentId, saved));
      } catch (e) {
        if (_disposed || _seq[key] != n) return;
        final prev = _confirmed.remove(key);
        _updateCheck(checkId, (c) => c.withMark(studentId, prev));
        state = state.copyWith(markError: _message(e, 'Хадгалж чадсангүй, дахин дарна уу'));
        _resync = true;
      } finally {
        _inflight--;
        if (!_disposed) {
          if (_seq[key] == n) _markSaving(key, false);
          if (_inflight == 0 && _resync) {
            _resync = false;
            unawaited(load(quiet: true));
          }
        }
      }
    }

    final p = (_queue[key] ?? Future<void>.value()).then((_) => send());
    _queue[key] = p;
    unawaited(
      p.whenComplete(() {
        if (_queue[key] == p) _queue.remove(key);
      }),
    );
  }

  /// Дугуй товч: тэмдэглэх/болиулах. Өөр ангид төлсөн мөрийг эндээс хөндөхгүй.
  void toggle(String checkId, String studentId) {
    final current = state.find(checkId)?.markOf(studentId);
    if (current?.elsewhere != null) return;
    mark(checkId, studentId, {'checked': !(current?.checked ?? false)});
  }

  Future<ClassCheck> create({String? title, int? amount, String? bookKey}) async {
    final created = await _repo.create(classId, title: title, amount: amount, bookKey: bookKey);
    final d = state.data;
    if (d != null && !_disposed) state = state.copyWith(data: d.copyWith(checks: [created, ...d.checks]));
    return created;
  }

  Future<ClassCheck> patch(String checkId, Map<String, Object?> body) async {
    final updated = await _repo.update(classId, checkId, body);
    final d = state.data;
    if (d == null || _disposed) return updated;
    final wasArchived = d.archived.any((c) => c.id == checkId);
    final isArchived = updated.archived;
    if (wasArchived == isArchived) {
      List<ClassCheck> put(List<ClassCheck> l) => [for (final c in l) c.id == checkId ? updated : c];
      state = state.copyWith(
        data: d.copyWith(checks: put(d.checks), archived: put(d.archived)),
      );
    } else {
      final checks = d.checks.where((c) => c.id != checkId).toList();
      final archived = d.archived.where((c) => c.id != checkId).toList();
      state = state.copyWith(
        data: isArchived
            ? d.copyWith(checks: checks, archived: [updated, ...archived])
            : d.copyWith(
                checks: [updated, ...checks]..sort((a, b) => b.createdAt.compareTo(a.createdAt)),
                archived: archived,
              ),
      );
    }
    return updated;
  }

  /// Устгах — сервер дээр зөөлөн (deletedAt): мөр, тэмдэглэгээ хадгалагдана, жагсаалтаас алга болно.
  Future<void> remove(String checkId) async {
    await _repo.remove(classId, checkId);
    final d = state.data;
    if (d == null || _disposed) return;
    state = state.copyWith(
      data: d.copyWith(
        checks: d.checks.where((c) => c.id != checkId).toList(),
        archived: d.archived.where((c) => c.id != checkId).toList(),
      ),
    );
  }
}

String _message(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;

/// Сурагчийн товч мэдээлэл (Чекийн жагсаалтаас нэр дарахад).
final checkStudentInfoProvider = FutureProvider.autoDispose
    .family<CheckStudentInfo, ({String classId, String studentId})>(
      (ref, a) => ref.watch(classChecksRepositoryProvider).studentInfo(a.classId, a.studentId),
    );
