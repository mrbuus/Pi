import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/passes_models.dart';
import '../data/passes_repository.dart';
import 'pass_detail_screen.dart';
import 'pass_sheets.dart';

/// Эрхийн удирдлага (`/app/admin/passes`, вэбийн `PassesAdminClient.tsx`): бүх эрх (идэвхгүйг оролцуулж),
/// хайлт, төлвийн шүүлтүүр, шинэ эрх. Мөр дарахад дэлгэрэнгүй (таблетад баруун талд).
class PassesScreen extends ConsumerStatefulWidget {
  const PassesScreen({super.key});

  static const path = '/app/admin/passes';

  @override
  ConsumerState<PassesScreen> createState() => _PassesScreenState();
}

class _PassesScreenState extends ConsumerState<PassesScreen> {
  final _list = DataListController<PassDef>();

  static const _filters = [DataFilter('active', 'Идэвхтэй'), DataFilter('inactive', 'Идэвхгүй')];

  Future<void> _reload() async {
    ref.invalidate(passesListProvider);
    await _list.refresh();
  }

  Future<void> _create() async {
    final created = await showPassEditor(context, ref);
    if (created == null || !mounted) return;
    ScaffoldMessenger.maybeOf(context)?.showSnackBar(const SnackBar(content: Text('Шинэ эрх үүслээ')));
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(passesAccessProvider);
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Эрхийн удирдлага'),
        actions: [
          if (access.canEdit)
            IconButton(tooltip: 'Шинэ эрх', icon: const Icon(AppIcons.add), onPressed: () => unawaited(_create())),
        ],
      ),
      body: !access.canView
          ? const PassesDenied()
          : DataListScreen<PassDef>(
              controller: _list,
              load: (q) async {
                // Сервер бүтэн жагсаалт буцаадаг: алдаа гарсан эсвэл шинэчлэх (шүүлтгүй эхний хуудас) үед дахин татна.
                if (ref.read(passesListProvider).hasError || (q.isFirstPage && q.search.isEmpty)) {
                  ref.invalidate(passesListProvider);
                }
                return DataPage.local(
                  await ref.read(passesListProvider.future),
                  q,
                  matches: (p, text) => p.name.toLowerCase().contains(text),
                  inFilter: (p, f) => f == 'active' ? p.active : !p.active,
                  filters: _filters,
                );
              },
              itemKey: (p) => p.id,
              searchHint: 'Эрхийн нэрээр хайх',
              filters: _filters,
              countLabel: (n) => '$n эрх',
              emptyTitle: 'Одоогоор эрх үүсгээгүй байна',
              emptyMessage: 'Шинэ эрх үүсгэснээр үнэ, хугацаа, хамрах хүрээг тохируулна',
              emptyIcon: AppIcons.key,
              itemBuilder: (_, p) => ItemRow(
                key: ValueKey('pass:${p.id}'),
                title: p.name,
                meta: [p.durationLabel, p.priceLabel, p.scope.summary, '${p.holdersCount} эзэмшигч'],
                trailing: MetaChip(
                  label: p.active ? 'Идэвхтэй' : 'Идэвхгүй',
                  tone: p.active ? ChipTone.success : ChipTone.neutral,
                ),
                chevron: true,
              ),
              onTap: (p) async {
                await context.push('${PassesScreen.path}/${Uri.encodeComponent(p.id)}');
                if (mounted) await _list.refresh();
              },
              detailBuilder: (_, p) =>
                  PassDetailView(key: ValueKey(p.id), passId: p.id, onChanged: () => unawaited(_list.refresh())),
            ),
    );
  }
}
