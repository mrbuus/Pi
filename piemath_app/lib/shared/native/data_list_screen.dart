import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/network/api_error.dart';
import '../../core/ui/ui.dart';

/// Жагсаалтын нэг хуудсыг ачаалах хүсэлт: хайлтын үг, сонгосон шүүлтүүр, хуудаслалтын cursor.
@immutable
class DataQuery {
  const DataQuery({this.search = '', this.filter, this.cursor});

  /// Хайлтын үг (зайг тайрсан). Хоосон бол хайлтгүй.
  final String search;

  /// Сонгосон шүүлтүүрийн [DataFilter.id]. `null` = «Бүгд».
  final String? filter;

  /// Дараагийн хуудасны cursor ([DataPage.nextCursor]). `null` = эхний хуудас.
  final String? cursor;

  bool get isFirstPage => cursor == null;

  DataQuery withCursor(String? cursor) => DataQuery(search: search, filter: filter, cursor: cursor);

  @override
  bool operator ==(Object other) =>
      other is DataQuery && other.search == search && other.filter == filter && other.cursor == cursor;

  @override
  int get hashCode => Object.hash(search, filter, cursor);

  @override
  String toString() => 'DataQuery(search: $search, filter: $filter, cursor: $cursor)';
}

/// Ачаалсан нэг хуудас.
@immutable
class DataPage<T> {
  const DataPage({required this.items, this.nextCursor, this.total, this.filterCounts = const {}});

  /// Санах ойд байгаа бүх мөрөөс хайлт + шүүлтүүр + хуудаслалт хийнэ (API бүтэн жагсаалт буцаадаг үед).
  ///
  /// [matches] — мөр хайлтын үгтэй таарах эсэх (үг аль хэдийн жижиг үсгээр). [inFilter] — мөр
  /// шүүлтүүрт орох эсэх. Шүүлтүүр бүрийн тоог хайлтын дараах мөрөөс тоолно ([DataFilter.allId] = бүгд).
  /// Cursor нь эхлэх индекс.
  factory DataPage.local(
    List<T> all,
    DataQuery query, {
    bool Function(T item, String search)? matches,
    bool Function(T item, String filterId)? inFilter,
    List<DataFilter> filters = const [],
    int pageSize = 30,
  }) {
    final q = query.search.trim().toLowerCase();
    final searched = q.isEmpty || matches == null ? all : all.where((i) => matches(i, q)).toList();
    final counts = <String, int>{DataFilter.allId: searched.length};
    if (inFilter != null) {
      for (final f in filters) {
        counts[f.id] = searched.where((i) => inFilter(i, f.id)).length;
      }
    }
    final filtered = query.filter == null || inFilter == null
        ? searched
        : searched.where((i) => inFilter(i, query.filter!)).toList();
    final start = int.tryParse(query.cursor ?? '') ?? 0;
    final end = (start + pageSize).clamp(0, filtered.length);
    return DataPage(
      items: start >= filtered.length ? const [] : filtered.sublist(start, end),
      nextCursor: end < filtered.length ? '$end' : null,
      total: filtered.length,
      filterCounts: counts,
    );
  }

  final List<T> items;

  /// Дараагийн хуудасны cursor. `null` = цааш мөр алга.
  final String? nextCursor;

  /// Одоогийн хайлт, шүүлтүүрээр нийт хэдэн мөр (мэдэгдэхгүй бол `null`).
  final int? total;

  /// Шүүлтүүрийн чип бүрийн тоо (`DataFilter.id` → тоо). [DataFilter.allId] нь «Бүгд»-ийн тоо.
  final Map<String, int> filterCounts;

  bool get hasMore => nextCursor != null;
}

/// Шүүлтүүрийн нэг чип.
@immutable
class DataFilter {
  const DataFilter(this.id, this.label, {this.count});

  /// «Бүгд» чипийн тооны түлхүүр ([DataPage.filterCounts]).
  static const allId = '*';

  final String id;
  final String label;

  /// Тогтмол тоо. [DataPage.filterCounts]-д энэ чипийн тоо ирвэл түүнийг харуулна.
  /// Тоо 0 бол чип нуугдана (сонгогдсон үед л харагдана).
  final int? count;
}

/// Хуудас ачаалагч.
typedef DataPageLoader<T> = Future<DataPage<T>> Function(DataQuery query);

/// [DataListScreen.summaryBuilder]-т өгөх жагсаалтын одоогийн төлөв.
@immutable
class DataListSnapshot<T> {
  const DataListSnapshot({
    required this.items,
    required this.query,
    required this.total,
    required this.isLoading,
    required this.error,
  });

  final List<T> items;
  final DataQuery query;

  /// Нийт тоо (серверээс ирсэн эсвэл ачаалсан мөрийн тоо).
  final int total;
  final bool isLoading;
  final Object? error;
}

/// Жагсаалтыг гаднаас удирдах: шинэчлэх, мөрийг optimistic байдлаар солих/хасах/нэмэх.
///
/// ```dart
/// final list = DataListController<Student>();
/// final removed = list.removeWhere((s) => s.id == id); // шууд алга болно
/// if (await showUndoSnack(context, message: 'Архивлалаа')) list.insert(removed!.index, removed.item);
/// ```
class DataListController<T> {
  _DataListScreenState<T>? _state;

  /// Одоо харагдаж буй мөрүүд.
  List<T> get items => List.unmodifiable(_state?._items ?? const []);

  /// Одоогийн хайлт, шүүлтүүр.
  DataQuery get query => _state?._query ?? const DataQuery();

  /// Эхний хуудсыг дахин ачаална (мөрүүдийг арилгахгүй).
  Future<void> refresh() => _state?._refresh() ?? Future.value();

  /// Бүх мөрийг солих ([optimisticMutation]-ийн `write`).
  void setItems(List<T> items) => _state?._mutate((list) => list..replaceRange(0, list.length, items));

  /// Таарсан мөр бүрийг [update]-ээр солино. Хэдэн мөр солигдсоныг буцаана.
  int updateWhere(bool Function(T item) test, T Function(T item) update) {
    var n = 0;
    _state?._mutate((list) {
      for (var i = 0; i < list.length; i++) {
        if (test(list[i])) {
          list[i] = update(list[i]);
          n++;
        }
      }
      return list;
    });
    return n;
  }

  /// Эхний таарсан мөрийг хасна (нийт тоо 1-ээр багасна). Буцааж оруулахад [insert].
  ({int index, T item})? removeWhere(bool Function(T item) test) {
    ({int index, T item})? removed;
    _state?._mutate((list) {
      final i = list.indexWhere(test);
      if (i >= 0) removed = (index: i, item: list.removeAt(i));
      return list;
    }, totalDelta: -1);
    return removed;
  }

  /// [index] байрлалд мөр нэмнэ (нийт тоо 1-ээр нэмэгдэнэ).
  void insert(int index, T item) =>
      _state?._mutate((list) => list..insert(index.clamp(0, list.length), item), totalDelta: 1);
}

/// Нийтлэг жагсаалтын дэлгэц (NATIVE-PLAN §3.1): хайлт → шүүлтүүрийн чип → тоо → карт мөрүүд.
///
/// - Хайлт 250ms debounce, шүүлтүүрийн чип тоотой (0 бол нуугдана), тооны мөр, наалттай хураангуй.
/// - Доош татаж шинэчлэх, cursor-оор цааш ачаалах (доод талд ойртоход эсвэл «Цааш үзэх» товчоор).
/// - Ачаалж байхад skeleton (shimmer-гүй), хоосон/алдааны төлөв «Дахин оролдох»-той.
/// - Таблетад (768dp-ээс өргөн) [detailBuilder] өгвөл зүүн жагсаалт, баруун дэлгэрэнгүй.
///
/// Энэ нь хуудасны ЗӨВХӨН бие — `Scaffold(appBar: AppBar(...), body: DataListScreen(...))`.
class DataListScreen<T> extends StatefulWidget {
  const DataListScreen({
    super.key,
    required this.load,
    required this.itemBuilder,
    this.itemKey,
    this.onTap,
    this.detailBuilder,
    this.controller,
    this.searchHint,
    this.filters = const [],
    this.initialFilter,
    this.allFilterLabel = 'Бүгд',
    this.countLabel,
    this.header,
    this.summaryBuilder,
    this.emptyTitle = AppStrings.emptyDefault,
    this.emptyMessage,
    this.emptyIcon = AppIcons.empty,
    this.emptyAction,
    this.detailPlaceholder = 'Жагсаалтаас сонгоно уу',
    this.cardItems = true,
    this.itemPadding = const EdgeInsets.all(AppSpace.lg),
    this.masterWidth = 380,
    this.searchDebounce = defaultDebounce,
    this.reloadKey,
  });

  static const defaultDebounce = Duration(milliseconds: 250);

  /// Хайлтын үг, шүүлтүүр, cursor-оор хуудас ачаална.
  final DataPageLoader<T> load;

  /// Мөрийн агуулга. [cardItems] бол [AppCard] дотор (дарах, сонгогдсон зурвасыг жагсаалт өөрөө).
  final Widget Function(BuildContext context, T item) itemBuilder;

  /// Мөрийн тогтвортой түлхүүр (id). Өгөөгүй бол мөр өөрөө (`==`).
  final Object Function(T item)? itemKey;

  /// Утсан дээр мөр дарах (ихэвчлэн дэлгэрэнгүй рүү `context.push`).
  /// Таблетад [detailBuilder] байвал оронд нь баруун талд нээгдэнэ.
  final void Function(T item)? onTap;

  /// Таблетын баруун талын дэлгэрэнгүй (master-detail). `null` бол үргэлж нэг багана.
  final Widget Function(BuildContext context, T item)? detailBuilder;

  final DataListController<T>? controller;

  /// Хайлтын талбарын бичвэр. `null` бол хайлтгүй.
  final String? searchHint;

  final List<DataFilter> filters;
  final String? initialFilter;
  final String allFilterLabel;

  /// «Нийт 24» мөрийн бичвэр. `null` бол «Нийт N».
  final String Function(int count)? countLabel;

  /// Хайлтын дээрх гүйлгэгддэг хэсэг (жишээ нь [StatRow]).
  final Widget? header;

  /// Тооны мөрийн доор, гүйлгэхэд дээр наалдаж үлдэх хураангуй.
  final Widget Function(BuildContext context, DataListSnapshot<T> snapshot)? summaryBuilder;

  final String emptyTitle;
  final String? emptyMessage;
  final IconData emptyIcon;
  final Widget? emptyAction;

  /// Таблетад юу ч сонгоогүй үеийн баруун талын бичвэр.
  final String detailPlaceholder;

  /// Мөр бүрийг [AppCard]-аар ороох. `false` бол [itemBuilder] өөрөө бүтэн мөр зурна.
  final bool cardItems;
  final EdgeInsetsGeometry itemPadding;

  /// Таблетын зүүн жагсаалтын өргөн.
  final double masterWidth;
  final Duration searchDebounce;

  /// Өөрчлөгдвөл эхний хуудсыг дахин ачаална (гаднын шүүлтүүр, жишээ нь сонгосон анги).
  final Object? reloadKey;

  @override
  State<DataListScreen<T>> createState() => _DataListScreenState<T>();
}

class _DataListScreenState<T> extends State<DataListScreen<T>> {
  final _search = TextEditingController();
  Timer? _debounce;

  late DataQuery _query = DataQuery(filter: widget.initialFilter);
  List<T> _items = [];
  String? _nextCursor;
  int? _total;
  Map<String, int> _counts = const {};
  Object? _error;
  bool _loading = true;
  bool _loadingMore = false;
  Object? _moreError;
  int _generation = 0;
  Object? _selected;

  @override
  void initState() {
    super.initState();
    widget.controller?._state = this;
    unawaited(_reload());
  }

  @override
  void didUpdateWidget(DataListScreen<T> old) {
    super.didUpdateWidget(old);
    if (old.controller != widget.controller) {
      if (old.controller?._state == this) old.controller?._state = null;
      widget.controller?._state = this;
    }
    if (old.reloadKey != widget.reloadKey) unawaited(_reload());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    if (widget.controller?._state == this) widget.controller?._state = null;
    super.dispose();
  }

  Object _keyOf(T item) => widget.itemKey?.call(item) ?? item as Object;

  /// Эхний хуудсыг шинээр (мөрүүдийг арилгаж, skeleton-оор) ачаална.
  Future<void> _reload() async {
    setState(() {
      _items = [];
      _nextCursor = null;
      _total = null;
      _error = null;
      _moreError = null;
      _loading = true;
      _loadingMore = false;
    });
    await _fetchFirst();
  }

  /// Доош татах: одоогийн мөрүүд харагдсаар, эхний хуудсаар солигдоно.
  Future<void> _refresh() async {
    _moreError = null;
    await _fetchFirst(keepOnError: true);
  }

  Future<void> _fetchFirst({bool keepOnError = false}) async {
    final gen = ++_generation;
    final query = _query.withCursor(null);
    try {
      final page = await widget.load(query);
      if (!mounted || gen != _generation) return;
      setState(() {
        _items = page.items.toList();
        _nextCursor = page.nextCursor;
        _total = page.total;
        if (page.filterCounts.isNotEmpty) _counts = page.filterCounts;
        _error = null;
        _loading = false;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted || gen != _generation) return;
      if (keepOnError && _items.isNotEmpty) {
        setState(() => _loading = false);
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(_messageOf(e))));
        return;
      }
      setState(() {
        _error = e;
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    final cursor = _nextCursor;
    if (cursor == null || _loading || _loadingMore) return;
    final gen = _generation;
    setState(() {
      _loadingMore = true;
      _moreError = null;
    });
    try {
      final page = await widget.load(_query.withCursor(cursor));
      if (!mounted || gen != _generation) return;
      setState(() {
        _items = [..._items, ...page.items];
        _nextCursor = page.nextCursor;
        _total = page.total ?? _total;
        if (page.filterCounts.isNotEmpty) _counts = page.filterCounts;
        _loadingMore = false;
      });
    } catch (e) {
      if (!mounted || gen != _generation) return;
      setState(() {
        _moreError = e;
        _loadingMore = false;
      });
    }
  }

  void _mutate(List<T> Function(List<T> list) change, {int totalDelta = 0}) {
    if (!mounted) return;
    setState(() {
      final before = _items.length;
      _items = change(_items.toList());
      final diff = _items.length - before;
      if (_total != null && diff != 0) _total = (_total! + (totalDelta == 0 ? diff : totalDelta)).clamp(0, 1 << 31);
    });
  }

  void _onSearchChanged(String text) {
    setState(() {}); // цэвэрлэх товч
    _debounce?.cancel();
    _debounce = Timer(widget.searchDebounce, () => _applySearch(text));
  }

  void _applySearch(String text) {
    _debounce?.cancel();
    final s = text.trim();
    if (s == _query.search) return;
    _query = DataQuery(search: s, filter: _query.filter);
    unawaited(_reload());
  }

  void _clearSearch() {
    _search.clear();
    setState(() {});
    _applySearch('');
  }

  void _setFilter(String? id) {
    if (id == _query.filter) return;
    unawaited(HapticFeedback.selectionClick());
    _query = DataQuery(search: _query.search, filter: id);
    unawaited(_reload());
  }

  bool _onScroll(ScrollNotification n) {
    if (n.metrics.axis == Axis.vertical && n.metrics.extentAfter < 480) unawaited(_loadMore());
    return false;
  }

  static String _messageOf(Object e) => e is ApiError ? e.message : AppStrings.genericError;

  int? _countFor(DataFilter f) => _counts[f.id] ?? f.count;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final wide = widget.detailBuilder != null && constraints.maxWidth >= AppSizes.tabletBreakpoint;
        final list = _buildList(context, wide);
        if (!wide) return list;
        return Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(width: widget.masterWidth, child: list),
            VerticalDivider(width: 1, thickness: 1, color: context.colors.line),
            Expanded(child: _buildDetail(context)),
          ],
        );
      },
    );
  }

  Widget _buildDetail(BuildContext context) {
    final key = _selected;
    T? item;
    if (key != null) {
      for (final i in _items) {
        if (_keyOf(i) == key) {
          item = i;
          break;
        }
      }
    }
    if (item == null) {
      return EmptyState(icon: AppIcons.listTodo, title: widget.detailPlaceholder);
    }
    return KeyedSubtree(
      key: ValueKey(key),
      // Зүүн жагсаалт PrimaryScrollController-ийг эзэмшинэ — дэлгэрэнгүй өөрийнхийг хэрэглэнэ.
      child: PrimaryScrollController.none(child: widget.detailBuilder!(context, item as T)),
    );
  }

  Widget _buildList(BuildContext context, bool wide) {
    final c = context.colors;
    final showCount = !_loading && _error == null && _items.isNotEmpty;
    final total = _total ?? _items.length;
    return RefreshIndicator(
      color: c.brand,
      backgroundColor: c.surface,
      onRefresh: _refresh,
      child: NotificationListener<ScrollNotification>(
        onNotification: _onScroll,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
          slivers: [
            if (widget.header != null)
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, 0),
                sliver: SliverToBoxAdapter(child: widget.header),
              ),
            if (widget.searchHint != null) SliverToBoxAdapter(child: _searchField(context)),
            if (widget.filters.isNotEmpty) SliverToBoxAdapter(child: _chips(context)),
            if (showCount)
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xs),
                  child: Semantics(
                    liveRegion: true,
                    child: Text(widget.countLabel?.call(total) ?? 'Нийт $total', style: context.text.bodySmall),
                  ),
                ),
              ),
            if (widget.summaryBuilder != null)
              PinnedHeaderSliver(
                child: ColoredBox(
                  color: c.bg,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.sm),
                    child: widget.summaryBuilder!(
                      context,
                      DataListSnapshot<T>(
                        items: List.unmodifiable(_items),
                        query: _query,
                        total: total,
                        isLoading: _loading,
                        error: _error,
                      ),
                    ),
                  ),
                ),
              ),
            ..._content(context, wide),
          ],
        ),
      ),
    );
  }

  List<Widget> _content(BuildContext context, bool wide) {
    if (_loading && _items.isEmpty) {
      return [const SliverToBoxAdapter(child: _ListSkeleton())];
    }
    if (_error != null && _items.isEmpty) {
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: ErrorState(message: _messageOf(_error!), onRetry: _reload),
        ),
      ];
    }
    if (_items.isEmpty) {
      final narrowed = _query.search.isNotEmpty || _query.filter != null;
      return [
        SliverFillRemaining(
          hasScrollBody: false,
          child: narrowed
              ? const EmptyState(
                  icon: AppIcons.search,
                  title: 'Илэрц олдсонгүй',
                  message: 'Өөр үгээр хайх эсвэл шүүлтүүрээ солиод үзнэ үү',
                )
              : EmptyState(
                  icon: widget.emptyIcon,
                  title: widget.emptyTitle,
                  message: widget.emptyMessage,
                  action: widget.emptyAction,
                ),
        ),
      ];
    }
    final bottom = MediaQuery.viewPaddingOf(context).bottom;
    return [
      SliverPadding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, 0),
        sliver: SliverList.builder(
          itemCount: _items.length,
          itemBuilder: (context, i) => Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.sm),
            child: _row(context, _items[i], wide),
          ),
        ),
      ),
      SliverToBoxAdapter(child: _footer(context)),
      SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl + bottom)),
    ];
  }

  Widget _row(BuildContext context, T item, bool wide) {
    final key = _keyOf(item);
    final selected = wide && key == _selected;
    VoidCallback? tap;
    if (wide) {
      tap = () {
        unawaited(HapticFeedback.selectionClick());
        setState(() => _selected = key);
      };
    } else if (widget.onTap != null) {
      tap = () => widget.onTap!(item);
    }
    final content = widget.itemBuilder(context, item);
    final Widget row;
    if (widget.cardItems) {
      row = AppCard(
        onTap: tap,
        accent: selected ? context.colors.brandBright : null,
        padding: widget.itemPadding,
        child: content,
      );
    } else {
      row = tap == null
          ? content
          : Material(
              type: MaterialType.transparency,
              child: InkWell(onTap: tap, child: content),
            );
    }
    return KeyedSubtree(
      key: ValueKey(key),
      child: Semantics(selected: wide ? selected : null, child: row),
    );
  }

  Widget _footer(BuildContext context) {
    if (_loadingMore) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: AppSpace.gutter),
        child: SkeletonPulse(child: SkeletonCard()),
      );
    }
    if (_moreError != null) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
        child: Column(
          children: [
            Text(
              _messageOf(_moreError!),
              style: context.text.bodySmall?.copyWith(color: context.colors.error),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpace.sm),
            OutlinedButton.icon(
              onPressed: _loadMore,
              icon: const Icon(AppIcons.retry, size: 18),
              label: const Text(AppStrings.retry),
            ),
          ],
        ),
      );
    }
    if (_nextCursor != null) {
      return Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
        child: OutlinedButton(onPressed: _loadMore, child: const Text('Цааш үзэх')),
      );
    }
    return const SizedBox.shrink();
  }

  Widget _searchField(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xs),
      child: TextField(
        controller: _search,
        onChanged: _onSearchChanged,
        onSubmitted: _applySearch,
        textInputAction: TextInputAction.search,
        decoration: InputDecoration(
          hintText: widget.searchHint,
          prefixIcon: const Icon(AppIcons.search, size: 20),
          suffixIcon: _search.text.isEmpty
              ? null
              : IconButton(tooltip: 'Цэвэрлэх', icon: const Icon(AppIcons.close, size: 18), onPressed: _clearSearch),
        ),
      ),
    );
  }

  Widget _chips(BuildContext context) {
    final chips = <Widget>[
      _chip(context, label: widget.allFilterLabel, count: _counts[DataFilter.allId], id: null),
      for (final f in widget.filters)
        if (_countFor(f) != 0 || _query.filter == f.id) _chip(context, label: f.label, count: _countFor(f), id: f.id),
    ];
    return SizedBox(
      height: AppSizes.minTap + AppSpace.sm,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: AppSpace.xs),
        itemCount: chips.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
        itemBuilder: (_, i) => chips[i],
      ),
    );
  }

  Widget _chip(BuildContext context, {required String label, required int? count, required String? id}) {
    final c = context.colors;
    final selected = _query.filter == id;
    final color = selected ? c.brand : c.ink;
    return ChoiceChip(
      key: ValueKey('filter:${id ?? DataFilter.allId}'),
      selected: selected,
      showCheckmark: false,
      onSelected: (_) => _setFilter(id),
      selectedColor: c.brandTint,
      backgroundColor: c.surface,
      side: BorderSide(color: selected ? c.brandTint : c.line),
      shape: const StadiumBorder(),
      label: Text.rich(
        TextSpan(
          children: [
            TextSpan(text: label),
            if (count != null)
              TextSpan(
                text: '  $count',
                style: TextStyle(color: selected ? c.brand : c.inkDim, fontWeight: FontWeight.w500),
              ),
          ],
        ),
        style: context.text.labelLarge?.copyWith(
          color: color,
          fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
        ),
      ),
    );
  }
}

class _ListSkeleton extends StatelessWidget {
  const _ListSkeleton();

  @override
  Widget build(BuildContext context) {
    return SkeletonPulse(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
        child: Column(
          children: [
            for (var i = 0; i < 5; i++) ...[
              if (i > 0) const SizedBox(height: AppSpace.sm),
              SkeletonCard(lines: i.isEven ? 1 : 2),
            ],
          ],
        ),
      ),
    );
  }
}

/// Жагсаалтын картын нийтлэг мөр: дүрс/аватар, гарчиг, мета (Dot-оор), баруун талд төлөв.
class ItemRow extends StatelessWidget {
  const ItemRow({
    super.key,
    required this.title,
    this.meta = const [],
    this.subtitle,
    this.leading,
    this.trailing,
    this.chevron = false,
  });

  final String title;

  /// [Meta]-ийн зүйлс (`String` эсвэл `Widget`), хоосныг алгасна.
  final List<Object?> meta;

  /// Мета-гийн доорх нэмэлт мөр.
  final Widget? subtitle;
  final Widget? leading;
  final Widget? trailing;

  /// Баруун талын «>» дүрс (дэлгэрэнгүй рүү ордог мөр).
  final bool chevron;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (leading != null) ...[leading!, const SizedBox(width: AppSpace.md)],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(title, style: context.text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
              if (Meta.visible(meta).isNotEmpty) ...[const SizedBox(height: 2), Meta(items: meta)],
              if (subtitle != null) ...[
                const SizedBox(height: AppSpace.xs),
                DefaultTextStyle.merge(style: context.text.bodySmall, child: subtitle!),
              ],
            ],
          ),
        ),
        if (trailing != null) ...[const SizedBox(width: AppSpace.sm), trailing!],
        if (chevron) ...[
          const SizedBox(width: AppSpace.xs),
          Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
        ],
      ],
    );
  }
}
