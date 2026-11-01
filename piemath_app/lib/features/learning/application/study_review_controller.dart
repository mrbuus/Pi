import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/study_models.dart';
import '../data/study_repository.dart';
import '../domain/study_logic.dart';
import '../ui/inline_message.dart';

@immutable
class ReviewState {
  const ReviewState({
    this.loading = true,
    this.options,
    this.run,
    this.index = 0,
    this.busy = false,
    this.error,
    this.loadError,
    this.fetchedAtDevice,
  });

  /// Анхны ачаалал.
  final bool loading;
  final StudyOptions? options;
  final StudyRun? run;
  final int index;

  /// Хүсэлт явж байна.
  final bool busy;

  /// Үйлдлийн алдаа (дэлгэц хэвээр, мессеж харагдана).
  final String? error;

  /// Анхны ачааллын алдаа (дэлгэц блоклоно).
  final String? loadError;

  /// Run-ийг авсан үеийн төхөөрөмжийн цаг — серверийн цагтай тэгшлэхэд.
  final DateTime? fetchedAtDevice;

  StudyItem? get item => run != null && index >= 0 && index < run!.items.length ? run!.items[index] : null;

  ReviewState copyWith({
    bool? loading,
    StudyOptions? options,
    Object? run = _keep,
    int? index,
    bool? busy,
    Object? error = _keep,
    Object? loadError = _keep,
    DateTime? fetchedAtDevice,
  }) => ReviewState(
    loading: loading ?? this.loading,
    options: options ?? this.options,
    run: identical(run, _keep) ? this.run : run as StudyRun?,
    index: index ?? this.index,
    busy: busy ?? this.busy,
    error: identical(error, _keep) ? this.error : error as String?,
    loadError: identical(loadError, _keep) ? this.loadError : loadError as String?,
    fetchedAtDevice: fetchedAtDevice ?? this.fetchedAtDevice,
  );
}

const Object _keep = Object();

/// Давтлагын урсгал: сонголт → эхлэх → хариулах → хаах. Бодит дүрмийг СЕРВЕР баримтална.
class StudyReviewController extends Notifier<ReviewState> {
  /// Ижил агуулгатай хүсэлтийг дахин илгээхэд ИЖИЛ id (idempotency).
  ({String key, String id})? _createReq;
  ({String key, String id})? _respReq;

  @override
  ReviewState build() => const ReviewState();

  StudyRepository get _repo => ref.read(studyRepositoryProvider);

  String _reqId(({String key, String id})? slot, String key, void Function(({String key, String id})) save) {
    if (slot != null && slot.key == key) return slot.id;
    final n = (key: key, id: newRequestId());
    save(n);
    return n.id;
  }

  /// [runId]: холбоосоор ирсэн эсвэл серверийн `resumeRunId`-аар үргэлжлүүлнэ.
  Future<void> init({String? runId}) async {
    state = const ReviewState();
    try {
      final options = await _repo.options();
      state = state.copyWith(options: options);
      final id = runId ?? options.resumeRunId;
      if (id != null) {
        final run = await _repo.run(id);
        state = state.copyWith(run: run, fetchedAtDevice: DateTime.now().toUtc(), index: 0);
      }
      state = state.copyWith(loading: false, loadError: null);
    } catch (e) {
      state = state.copyWith(loading: false, loadError: errorText(e, 'Давтлага нээгдсэнгүй. Холболтоо шалгаад дахин оролдоно уу.'));
    }
  }

  Future<void> start({required int budgetMinutes, required List<String> chapterIds}) async {
    if (state.busy) return;
    final sorted = [...chapterIds]..sort();
    final key = '$budgetMinutes|${sorted.join(',')}';
    final id = _reqId(_createReq, key, (v) => _createReq = v);
    state = state.copyWith(busy: true, error: null);
    try {
      final run = await _repo.create(budgetMinutes: budgetMinutes, chapterIds: sorted, requestId: id);
      state = state.copyWith(run: run, index: 0, busy: false, fetchedAtDevice: DateTime.now().toUtc());
    } catch (e) {
      state = state.copyWith(busy: false, error: errorText(e, 'Давтлага эхэлсэнгүй. Дахин оролдоно уу.'));
    }
  }

  Future<void> respond({required String answer, required List<String> flags}) async {
    final run = state.run;
    final item = state.item;
    if (run == null || item == null || state.busy) return;
    final kind = item.first != null ? 'CORRECTION' : 'FIRST';
    final sortedFlags = [...flags]..sort();
    final key = '${item.id}|$kind|$answer|${sortedFlags.join(',')}';
    final id = _reqId(_respReq, key, (v) => _respReq = v);
    state = state.copyWith(busy: true, error: null);
    try {
      final next = await _repo.respond(run.id, item.id, requestId: id, answer: answer, flags: sortedFlags, kind: kind);
      state = state.copyWith(run: next, busy: false, fetchedAtDevice: DateTime.now().toUtc());
      _respReq = null;
    } catch (e) {
      state = state.copyWith(busy: false, error: errorText(e, 'Хариулт хадгалагдсангүй. Дахин оролдоно уу.'));
    }
  }

  Future<void> submit() async {
    final run = state.run;
    if (run == null || state.busy) return;
    state = state.copyWith(busy: true, error: null);
    try {
      final next = await _repo.submit(run.id);
      state = state.copyWith(run: next, busy: false, fetchedAtDevice: DateTime.now().toUtc());
    } catch (e) {
      state = state.copyWith(busy: false, error: errorText(e, 'Давтлага хаагдсангүй. Дахин оролдоно уу.'));
    }
  }

  /// Хугацаа дуусахад серверийн төлвийг дахин авна.
  Future<void> refreshRun() async {
    final run = state.run;
    if (run == null) return;
    try {
      final next = await _repo.run(run.id);
      state = state.copyWith(run: next, fetchedAtDevice: DateTime.now().toUtc());
    } catch (_) {
      state = state.copyWith(error: 'Серверийн хугацааг дахин шалгах шаардлагатай');
    }
  }

  void moveTo(int i) {
    final run = state.run;
    if (run == null || i < 0 || i >= run.items.length) return;
    state = state.copyWith(index: i, error: null);
    _respReq = null;
  }

  /// Өөр давтлага сонгох.
  Future<void> reset() async {
    _createReq = null;
    _respReq = null;
    state = state.copyWith(run: null, index: 0, error: null);
    try {
      final options = await _repo.options();
      state = state.copyWith(options: options);
    } catch (_) {
      state = state.copyWith(error: 'Сэдвийн мэдээлэл шинэчлэгдсэнгүй');
    }
  }
}

final studyReviewProvider = NotifierProvider.autoDispose<StudyReviewController, ReviewState>(StudyReviewController.new);

@immutable
class HistoryView {
  const HistoryView({required this.page, this.loadingMore = false, this.moreError = false});

  final HistoryPage page;
  final bool loadingMore;
  final bool moreError;
}

/// Жилийн давтлагын түүх. Жил солиход дахин ачаална.
final historyYearProvider = NotifierProvider.autoDispose<_YearNotifier, int>(_YearNotifier.new);

class _YearNotifier extends Notifier<int> {
  @override
  int build() => DateTime.now().toUtc().add(const Duration(hours: 8)).year;

  void set(int y) => state = y;
}

class HistoryController extends AsyncNotifier<HistoryView> {
  @override
  Future<HistoryView> build() async {
    final year = ref.watch(historyYearProvider);
    return HistoryView(page: await ref.watch(studyRepositoryProvider).history(year: year));
  }

  Future<void> loadMore() async {
    final cur = state.value;
    if (cur == null || cur.page.nextCursor == null || cur.loadingMore) return;
    state = AsyncData(HistoryView(page: cur.page, loadingMore: true));
    try {
      final next = await ref
          .read(studyRepositoryProvider)
          .history(year: ref.read(historyYearProvider), cursor: cur.page.nextCursor);
      final known = cur.page.items.map((i) => i.id).toSet();
      state = AsyncData(
        HistoryView(
          page: HistoryPage(
            year: next.year,
            items: [...cur.page.items, ...next.items.where((i) => !known.contains(i.id))],
            nextCursor: next.nextCursor,
            caution: next.caution,
          ),
        ),
      );
    } catch (_) {
      state = AsyncData(HistoryView(page: cur.page, moreError: true));
    }
  }
}

final historyProvider = AsyncNotifierProvider.autoDispose<HistoryController, HistoryView>(HistoryController.new);
