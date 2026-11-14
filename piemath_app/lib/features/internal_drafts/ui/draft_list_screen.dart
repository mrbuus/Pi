import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/draft_models.dart';
import '../data/draft_repository.dart';
import 'draft_ui.dart';

/// Бодлогын ноорог (`/app/internal`, вэбийн `SetList`) — нийтлэхээс өмнөх бодлого, тестийн ноорог.
/// Зөвхөн Админ, Багш+ харна.
class DraftListScreen extends ConsumerStatefulWidget {
  const DraftListScreen({super.key});

  static const path = '/app/internal';

  @override
  ConsumerState<DraftListScreen> createState() => _DraftListScreenState();
}

class _DraftListScreenState extends ConsumerState<DraftListScreen> {
  final _list = DataListController<DraftSet>();
  DataQuery? _last;
  bool _creating = false;

  static const _filters = [DataFilter('draft', 'Ноорог'), DataFilter('published', 'Нийтэлсэн')];

  Future<DataPage<DraftSet>> _load(DataQuery q) async {
    if (q.isFirstPage && q == _last) ref.invalidate(draftSetsProvider);
    if (q.isFirstPage) _last = q;
    return DataPage.local(
      await ref.read(draftSetsProvider.future),
      q,
      matches: (s, t) => '${s.title} ${s.topic ?? ''} ${s.chapter?.title ?? ''}'.toLowerCase().contains(t),
      inFilter: (s, f) => f == 'published' ? s.published : !s.published,
      filters: _filters,
    );
  }

  Future<void> _open(String id) async {
    await context.push('${DraftListScreen.path}/${Uri.encodeComponent(id)}');
    _last = null;
    if (mounted) await _list.refresh();
  }

  Future<void> _create() async {
    if (_creating) return;
    setState(() => _creating = true);
    try {
      final s = await ref.read(draftRepositoryProvider).create();
      if (mounted) await _open(s.id);
    } catch (e) {
      if (mounted) draftSnack(context, draftError(e, 'Ноорог үүсгэж чадсангүй'));
    } finally {
      if (mounted) setState(() => _creating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final can = ref.watch(draftAccessProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Бодлогын ноорог')),
      floatingActionButton: can
          ? FloatingActionButton.extended(
              onPressed: _creating ? null : _create,
              icon: const Icon(AppIcons.add),
              label: const Text('Шинэ ноорог'),
            )
          : null,
      body: !can
          ? const EmptyState(
              icon: AppIcons.shield,
              title: AppStrings.forbidden,
              message: 'Ноорогийг зөвхөн Багш+ болон Админ харна',
            )
          : DataListScreen<DraftSet>(
              controller: _list,
              load: _load,
              itemKey: (s) => s.id,
              searchHint: 'Нэр, сэдвээр хайх',
              filters: _filters,
              countLabel: (n) => '$n ноорог',
              emptyTitle: 'Ноорог алга',
              emptyMessage: 'Шинэ ноорог үүсгээд бодлогоо бичих, ChatGPT эсвэл Word-оос оруулна',
              emptyIcon: AppIcons.draft,
              onTap: (s) => _open(s.id),
              itemBuilder: (context, s) => ItemRow(
                title: s.displayTitle,
                meta: [s.subject.label, s.chapter?.title, s.topic],
                chevron: true,
                subtitle: Padding(
                  padding: const EdgeInsets.only(top: AppSpace.xs),
                  child: Wrap(
                    spacing: AppSpace.sm,
                    runSpacing: AppSpace.xs,
                    children: [
                      MetaChip(
                        label: s.published ? 'Нийтэлсэн' : 'Ноорог',
                        tone: s.published ? ChipTone.success : ChipTone.brand,
                      ),
                      MetaChip(label: '${s.count} бодлого'),
                      if (s.changedSincePublish)
                        const MetaChip(label: 'Нийтэлснээс хойш зассан', tone: ChipTone.warning),
                      if (s.updatedAt != null) MetaChip(label: '${s.updatedByName}, ${DateMn.relative(s.updatedAt!)}'),
                    ],
                  ),
                ),
              ),
            ),
    );
  }
}
