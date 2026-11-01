import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../homework/domain/homework_logic.dart' show dayLabel;
import '../data/theory_models.dart';
import '../data/theory_repository.dart';

/// `/app/theory` — хичээлийн өдөр бүрийн онолын (самбарын) зураг, сэдэв/тестээр хайх
/// (вэбийн `student-hub/TheoryBrowser`).
class TheoryScreen extends ConsumerStatefulWidget {
  const TheoryScreen({super.key});

  @override
  ConsumerState<TheoryScreen> createState() => _TheoryScreenState();
}

class _TheoryScreenState extends ConsumerState<TheoryScreen> {
  final _search = TextEditingController();
  Timer? _debounce;
  String _query = '';

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

  @override
  Widget build(BuildContext context) {
    final rows = ref.watch(theoryListProvider(_query));
    return Scaffold(
      appBar: AppBar(title: const Text('Онолын зураг')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
            child: TextField(
              controller: _search,
              onChanged: _onChanged,
              textInputAction: TextInputAction.search,
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
          Expanded(
            child: rows.when(
              skipLoadingOnRefresh: true,
              loading: () => const LoadingState(),
              error: (e, _) => ErrorState(
                message: e is ApiError ? e.message : 'Онолын зургийг нээж чадсангүй',
                onRetry: () => ref.invalidate(theoryListProvider(_query)),
              ),
              data: (list) {
                if (list.isEmpty) {
                  return _query.isEmpty
                      ? const EmptyState(
                          icon: AppIcons.theoryPhoto,
                          title: 'Хичээлийн өдөр алга',
                          message: 'Ангидаа хичээл орсон өдөр бүр энд гарна',
                        )
                      : const EmptyState(icon: AppIcons.search, title: 'Олдсонгүй', message: 'Өөр үгээр хайгаад үзээрэй');
                }
                return RefreshIndicator(
                  onRefresh: () async => ref.invalidate(theoryListProvider(_query)),
                  child: ListView.separated(
                    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.xxl),
                    itemCount: list.length,
                    separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                    itemBuilder: (_, i) => _TheoryRowCard(row: list[i]),
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

class _TheoryRowCard extends StatelessWidget {
  const _TheoryRowCard({required this.row});

  final TheoryRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title = row.topic ?? (row.tests.isNotEmpty ? row.tests.first : 'Сэдэв тодорхойгүй');
    return AppCard(
      onTap: () => context.push(theoryDayPath(row.classroomId, row.date)),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(dayLabel(row.date), style: context.text.labelMedium?.copyWith(color: c.inkDim)),
                const SizedBox(height: 2),
                Text(title, style: context.text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 2),
                Meta(items: [row.classroomName, if (row.uploaders.isNotEmpty) row.uploaders.join(', ')]),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          if (row.count > 0)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(AppIcons.gallery, size: 16, color: c.brand),
                const SizedBox(width: 4),
                Text('${row.count}', style: context.text.labelLarge?.copyWith(color: c.brand)),
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
