import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/mistake_models.dart';
import '../data/mistakes_repository.dart';

/// Жагсаалтын шүүлтүүр.
@immutable
class MistakeFilter {
  const MistakeFilter({this.status, this.topic, this.source});

  final MistakeStatus? status;
  final String? topic;
  final MistakeSource? source;

  @override
  bool operator ==(Object other) =>
      other is MistakeFilter && other.status == status && other.topic == topic && other.source == source;

  @override
  int get hashCode => Object.hash(status, topic, source);
}

class MistakeFilterController extends Notifier<MistakeFilter> {
  @override
  MistakeFilter build() => const MistakeFilter();

  void setStatus(MistakeStatus? s) => state = MistakeFilter(status: s, topic: state.topic, source: state.source);

  void setTopic(String? t) => state = MistakeFilter(status: state.status, topic: t, source: state.source);

  void setSource(MistakeSource? s) => state = MistakeFilter(status: state.status, topic: state.topic, source: s);

  void clear() => state = const MistakeFilter();
}

final mistakeFilterProvider = NotifierProvider<MistakeFilterController, MistakeFilter>(MistakeFilterController.new);

/// Жагсаалт + дараагийн хуудас. Шүүлтүүр өөрчлөгдөхөд дахин ачаална.
class MistakesController extends AsyncNotifier<Notebook> {
  bool _loadingMore = false;

  /// «Дараагийн хуудас» алдаатай болсон эсэх (жагсаалт хэвээр, доор дахин оролдох).
  final moreFailed = ValueNotifier<bool>(false);

  @override
  Future<Notebook> build() {
    final f = ref.watch(mistakeFilterProvider);
    moreFailed.value = false;
    return ref.watch(mistakesRepositoryProvider).notebook(status: f.status, topic: f.topic, source: f.source);
  }

  Future<void> loadMore() async {
    final current = state.value;
    if (current == null || current.nextCursor == null || _loadingMore) return;
    _loadingMore = true;
    moreFailed.value = false;
    final f = ref.read(mistakeFilterProvider);
    try {
      final page = await ref
          .read(mistakesRepositoryProvider)
          .notebook(status: f.status, topic: f.topic, source: f.source, cursor: current.nextCursor);
      final latest = state.value ?? current;
      final known = latest.items.map((i) => i.id).toSet();
      state = AsyncData(
        latest.copyWith(
          items: [...latest.items, ...page.items.where((i) => !known.contains(i.id))],
          nextCursor: page.nextCursor,
        ),
      );
    } catch (_) {
      moreFailed.value = true;
    } finally {
      _loadingMore = false;
    }
  }

  /// Дэлгэц дээрх нэг алдааг шинэчилнэ (дахин оролдлого, шалтгаан, тэмдэглэл). Тоог төлөв зөөхөд тааруулна.
  void replace(Mistake updated) {
    final current = state.value;
    if (current == null) return;
    var counts = current.counts;
    final items = <Mistake>[];
    for (final m in current.items) {
      if (m.id == updated.id) {
        counts = counts.moved(m.status, updated.status);
        items.add(updated);
      } else {
        items.add(m);
      }
    }
    state = AsyncData(current.copyWith(items: items, counts: counts));
  }
}

final mistakesProvider = AsyncNotifierProvider.autoDispose<MistakesController, Notebook>(MistakesController.new);

/// Өнөөдрийн давтлага (дээд тал нь 5).
final todayMistakesProvider = FutureProvider.autoDispose<List<Mistake>>(
  (ref) => ref.watch(mistakesRepositoryProvider).today(),
);
