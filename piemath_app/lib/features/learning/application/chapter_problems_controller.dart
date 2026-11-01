import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/chapter_problem_models.dart';
import '../data/chapter_problems_repository.dart';

@immutable
class ChapterProblemsState {
  const ChapterProblemsState({required this.items, required this.hasMore});

  final List<ChapterProblem> items;
  final bool hasMore;
}

/// Бүлгийн бодлогын жагсаалт + «Цааш үзэх».
class ChapterProblemsController extends AsyncNotifier<ChapterProblemsState> {
  ChapterProblemsController(this.chapterId);

  final String chapterId;
  bool _loadingMore = false;

  /// «Цааш үзэх» алдаатай болсон эсэх (жагсаалт хэвээр, доор дахин оролдох).
  final moreFailed = ValueNotifier<bool>(false);

  @override
  Future<ChapterProblemsState> build() async {
    moreFailed.value = false;
    final first = await ref.watch(chapterProblemsRepositoryProvider).page(chapterId);
    return ChapterProblemsState(items: first, hasMore: first.length >= chapterProblemsPageSize);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || !current.hasMore || _loadingMore) return;
    _loadingMore = true;
    moreFailed.value = false;
    try {
      final page = await ref.read(chapterProblemsRepositoryProvider).page(chapterId, skip: current.items.length);
      final known = current.items.map((p) => p.id).toSet();
      state = AsyncData(
        ChapterProblemsState(
          items: [...current.items, ...page.where((p) => !known.contains(p.id))],
          hasMore: page.length >= chapterProblemsPageSize,
        ),
      );
    } catch (_) {
      moreFailed.value = true;
    } finally {
      _loadingMore = false;
    }
  }
}

final chapterProblemsProvider = AsyncNotifierProvider.autoDispose.family<ChapterProblemsController, ChapterProblemsState, String>(
  ChapterProblemsController.new,
);
