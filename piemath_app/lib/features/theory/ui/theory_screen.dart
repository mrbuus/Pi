import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../../homework/domain/homework_logic.dart' show dayLabel;
import '../data/theory_models.dart';
import '../data/theory_repository.dart';
import 'theory_day_screen.dart';

/// `/app/theory` — хичээлийн өдөр бүрийн онолын (самбарын) зураг (вэбийн `student-hub/TheoryBrowser`):
/// «Өнөөдрийн онол» дээд хэсэгт шууд илгээх, сэдэв/тестээр хайх, огноогоор шүүх (Бүгд / Өнөөдөр /
/// Өчигдөр / Огноо), сараар бүлэглэсэн жагсаалт. [initialDate] (`?date=`) — тэр өдрөөр шүүж, ганц ангийн
/// өдөр таарвал шууд нээнэ.
class TheoryScreen extends ConsumerStatefulWidget {
  const TheoryScreen({super.key, this.initialDate});

  final String? initialDate;

  @override
  ConsumerState<TheoryScreen> createState() => _TheoryScreenState();
}

class _TheoryScreenState extends ConsumerState<TheoryScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';
  late String _date = widget.initialDate ?? '';
  bool _autoOpened = false;

  TheoryFilter get _filter => (q: _query, date: _date);

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _onChanged(String v) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 400), () {
      if (mounted) setState(() => _query = v.trim());
    });
  }

  void _setDate(String d) => setState(() => _date = d);

  Future<void> _pickDate(String today) async {
    final now = parseDateKey(today)!;
    final initial = parseDateKey(_date) ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(initial.year, initial.month, initial.day),
      firstDate: DateTime(2024),
      lastDate: DateTime(now.year, now.month, now.day),
      helpText: 'Огноо сонгох',
    );
    if (picked == null || !mounted) return;
    _setDate(UbDateTime(picked.year, picked.month, picked.day).dateKey);
  }

  /// Самбараас ирсэн `?date=` ганц ангийн өдөртэй таарвал тэр өдрийг шууд нээнэ (вэбтэй адил).
  void _maybeAutoOpen(List<TheoryRow> list) {
    final initial = widget.initialDate;
    if (_autoOpened || initial == null || _date != initial || _query.isNotEmpty) return;
    _autoOpened = true;
    final matches = list.where((r) => r.date == initial).toList();
    if (matches.length != 1) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.replace(theoryDayPath(matches.first.classroomId, matches.first.date));
    });
  }

  @override
  Widget build(BuildContext context) {
    final today = UbDateTime.now().dateKey;
    final yesterday = UbDateTime.now().add(const Duration(days: -1)).dateKey;
    final filtered = _query.isNotEmpty || _date.isNotEmpty;
    final rows = ref.watch(theoryListProvider(_filter));
    return Scaffold(
      appBar: AppBar(title: const Text('Онолын зураг')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xs),
            child: TextField(
              controller: _search,
              onChanged: _onChanged,
              textInputAction: TextInputAction.search,
              style: const TextStyle(fontSize: 16),
              decoration: InputDecoration(
                hintText: 'Сэдэв эсвэл тестийн нэр',
                prefixIcon: const Icon(AppIcons.search, size: 20),
                suffixIcon: _search.text.isEmpty
                    ? null
                    : IconButton(
                        tooltip: 'Хайлтыг арилгах',
                        icon: const Icon(AppIcons.close, size: 18),
                        onPressed: () {
                          _search.clear();
                          _onChanged('');
                        },
                      ),
              ),
            ),
          ),
          _DateChips(
            value: _date,
            today: today,
            yesterday: yesterday,
            onSelect: _setDate,
            onPick: () => _pickDate(today),
          ),
          Expanded(
            child: rows.when(
              skipLoadingOnRefresh: true,
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(
                message: e is ApiError ? e.message : 'Онолын зургийг нээж чадсангүй',
                onRetry: () => ref.invalidate(theoryListProvider(_filter)),
              ),
              data: (list) {
                _maybeAutoOpen(list);
                if (list.isEmpty) {
                  if (!filtered) {
                    return const EmptyState(
                      icon: AppIcons.theoryPhoto,
                      title: 'Хичээлийн өдөр алга',
                      message: 'Ангидаа хичээл орсон өдөр бүр энд гарна',
                    );
                  }
                  return EmptyState(
                    icon: AppIcons.search,
                    title: 'Олдсонгүй',
                    message: _query.isNotEmpty ? 'Өөр үгээр хайгаад үзээрэй' : 'Энэ өдөр хичээл ороогүй байна',
                    action: OutlinedButton(
                      onPressed: () {
                        _search.clear();
                        _debounce?.cancel();
                        setState(() {
                          _query = '';
                          _date = '';
                        });
                      },
                      child: const Text('Бүх өдөр'),
                    ),
                  );
                }
                final items = buildTheoryItems(list, today: today, showToday: !filtered);
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(theoryListProvider(_filter)),
                  child: ListView.builder(
                    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.xxl),
                    itemCount: items.length,
                    itemBuilder: (_, i) => switch (items[i]) {
                      TheoryHeaderItem(:final title) => Padding(
                          padding: EdgeInsets.only(top: i == 0 ? AppSpace.xs : AppSpace.lg, bottom: AppSpace.sm),
                          child: Text(
                            title,
                            style: context.text.titleSmall?.copyWith(color: context.colors.inkDim),
                          ),
                        ),
                      TheoryTodayItem(:final row) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpace.sm),
                          child: _TodayTheoryCard(row: row),
                        ),
                      TheoryRowItem(:final row) => Padding(
                          padding: const EdgeInsets.only(bottom: AppSpace.sm),
                          child: _TheoryRowCard(row: row),
                        ),
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}

/// Жагсаалтын мөр: сарын гарчиг, «Өнөөдрийн онол» карт, эсвэл өдөр.
sealed class TheoryListItem {
  const TheoryListItem();
}

class TheoryHeaderItem extends TheoryListItem {
  const TheoryHeaderItem(this.title);
  final String title;
}

class TheoryTodayItem extends TheoryListItem {
  const TheoryTodayItem(this.row);
  final TheoryRow row;
}

class TheoryRowItem extends TheoryListItem {
  const TheoryRowItem(this.row);
  final TheoryRow row;
}

/// «11-р сар» (энэ жил) эсвэл «2025 оны 11-р сар».
String theoryMonthLabel(String ym, String currentYear) {
  final parts = ym.split('-');
  if (parts.length < 2) return ym;
  final m = int.tryParse(parts[1]) ?? 0;
  return parts[0] == currentYear ? '$m-р сар' : '${parts[0]} оны $m-р сар';
}

/// Өдрүүдийг огноогоор буурах, ангиар эрэмбэлж сараар бүлэглэнэ. [showToday] бол өнөөдрийн өдрүүд дээд
/// хэсэгт «Өнөөдрийн онол» болж гарна (шүүлтгүй жагсаалт өнөөдрийг агуулдаг — сервер сүүлийн 60 хоног).
List<TheoryListItem> buildTheoryItems(List<TheoryRow> rows, {required String today, required bool showToday}) {
  final sorted = [...rows]
    ..sort((a, b) {
      final d = b.date.compareTo(a.date);
      return d != 0 ? d : a.classroomName.compareTo(b.classroomName);
    });
  final out = <TheoryListItem>[];
  if (showToday) {
    final todays = sorted.where((r) => r.date == today).toList();
    if (todays.isNotEmpty) {
      out.add(const TheoryHeaderItem('Өнөөдрийн онол'));
      out.addAll(todays.map(TheoryTodayItem.new));
    }
  }
  final year = today.length >= 4 ? today.substring(0, 4) : '';
  String? ym;
  for (final r in sorted) {
    final m = r.date.length >= 7 ? r.date.substring(0, 7) : r.date;
    if (m != ym) {
      ym = m;
      out.add(TheoryHeaderItem(theoryMonthLabel(m, year)));
    }
    out.add(TheoryRowItem(r));
  }
  return out;
}

class _DateChips extends StatelessWidget {
  const _DateChips({
    required this.value,
    required this.today,
    required this.yesterday,
    required this.onSelect,
    required this.onPick,
  });

  final String value;
  final String today;
  final String yesterday;
  final ValueChanged<String> onSelect;
  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    final custom = value.isNotEmpty && value != today && value != yesterday;
    Widget chip(String label, bool selected, VoidCallback onTap, {IconData? icon}) => Padding(
          padding: const EdgeInsets.only(right: AppSpace.xs),
          child: ChoiceChip(
            label: Text(label),
            avatar: icon == null ? null : Icon(icon, size: 16),
            selected: selected,
            showCheckmark: false,
            onSelected: (_) => onTap(),
          ),
        );
    return SizedBox(
      height: 48,
      child: ListView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
        children: [
          chip('Бүгд', value.isEmpty, () => onSelect('')),
          chip('Өнөөдөр', value == today, () => onSelect(today)),
          chip('Өчигдөр', value == yesterday, () => onSelect(yesterday)),
          chip(custom ? dayLabel(value, withWeekday: false) : 'Огноо', custom, onPick, icon: AppIcons.calendar),
        ],
      ),
    );
  }
}

/// «Өнөөдрийн онол» — өдрийн дэлгэц рүү орохгүйгээр шууд илгээх (вэбийн дээд хэсгийн `TheoryDayPanel`).
class _TodayTheoryCard extends ConsumerWidget {
  const _TodayTheoryCard({required this.row});

  final TheoryRow row;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final day = ref.watch(theoryDayProvider((row.classroomId, row.date))).value;
    final title = row.topic ?? (row.tests.isNotEmpty ? row.tests.first : null);
    final count = day?.photos.length ?? row.uploaders.length;
    return AppCard(
      onTap: () => context.push(theoryDayPath(row.classroomId, row.date)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(row.classroomName, style: context.text.labelMedium?.copyWith(color: c.inkDim)),
          if (title != null) ...[
            const SizedBox(height: 2),
            Text(title, style: context.text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
          ],
          const SizedBox(height: AppSpace.xs),
          Row(
            children: [
              Icon(AppIcons.gallery, size: 16, color: count > 0 ? c.success : c.inkDim),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  count > 0 ? '$count хүн илгээсэн' : 'Одоогоор зураг алга',
                  style: context.text.bodySmall,
                ),
              ),
              Icon(AppIcons.forward, size: 18, color: c.inkDim),
            ],
          ),
          if (day != null && day.canUpload) ...[
            const SizedBox(height: AppSpace.sm),
            TheoryUploadActions(day: day),
          ] else if (day == null && row.canUpload) ...[
            const SizedBox(height: AppSpace.sm),
            const SkeletonLine(width: 180, height: 40),
          ],
        ],
      ),
    );
  }
}

class _TheoryRowCard extends StatelessWidget {
  const _TheoryRowCard({required this.row});

  final TheoryRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title = row.topic ?? (row.tests.isNotEmpty ? row.tests.first : 'Сэдэв тодорхойгүй');
    final d = parseDateKey(row.date);
    final names = row.uploaders.length > 2
        ? '${row.uploaders.take(2).join(', ')} +${row.uploaders.length - 2}'
        : row.uploaders.join(', ');
    return AppCard(
      onTap: () => context.push(theoryDayPath(row.classroomId, row.date)),
      semanticLabel: '${dayLabel(row.date)}, $title',
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.sm)),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('${d?.day ?? ''}', style: context.text.titleMedium?.copyWith(height: 1)),
                Text(d == null ? '' : weekdayShortMn(d.weekday), style: context.text.labelSmall?.copyWith(color: c.inkDim)),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: context.text.titleSmall?.copyWith(color: row.topic == null && row.tests.isEmpty ? c.inkDim : null),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Meta(items: [row.classroomName, names]),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          if (row.count > 0)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(AppIcons.gallery, size: 16, color: c.success),
                const SizedBox(width: 4),
                Text('${row.count}', style: context.text.labelLarge?.copyWith(color: c.success)),
              ],
            )
          else if (row.canUpload)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(AppIcons.camera, size: 16, color: c.brand),
                const SizedBox(width: 4),
                Text('Илгээх', style: context.text.labelLarge?.copyWith(color: c.brand)),
              ],
            )
          else
            Text('Зураггүй', style: context.text.bodySmall),
          Icon(AppIcons.forward, size: 18, color: c.inkDim),
        ],
      ),
    );
  }
}

/// `/app/theory/:classroomId/:date`.
String theoryDayPath(String classroomId, String date) =>
    '/app/theory/${Uri.encodeComponent(classroomId)}/${Uri.encodeComponent(date)}';
