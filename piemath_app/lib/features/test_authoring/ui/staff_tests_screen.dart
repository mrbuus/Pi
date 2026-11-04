import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/authoring_models.dart';
import '../data/authoring_repository.dart';
import 'authoring_widgets.dart';

/// Ажилтны `/app/tests` — тестийн жагсаалт, «Шинэ тест», мөр бүрийн «Засах» (вэбийн `/app/tests`
/// багшийн хэсэг: «+ Тест үүсгэх», `ExamsBoard`-ийн `canEdit`). Багш өөрийн үүсгэсэн тестийг л засна.
class StaffTestsScreen extends ConsumerStatefulWidget {
  const StaffTestsScreen({super.key});

  @override
  ConsumerState<StaffTestsScreen> createState() => _StaffTestsScreenState();
}

class _StaffTestsScreenState extends ConsumerState<StaffTestsScreen> {
  final _list = DataListController<StaffTestRow>();

  static const _filters = [
    DataFilter(TestTypes.daily, 'Өдрийн тест'),
    DataFilter(TestTypes.chapterExam, 'Сэдвийн шалгалт'),
    DataFilter(TestTypes.eeshMock, 'ЭЕШ сорил'),
    DataFilter('draft', 'Ноорог'),
  ];

  Future<void> _open(String path) async {
    await context.push(path);
    await _list.refresh();
  }

  @override
  Widget build(BuildContext context) {
    final perms = ref.watch(authoringPermissionsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Шалгалт')),
      floatingActionButton: perms.canAuthor
          ? FloatingActionButton.extended(
              key: const Key('new-test'),
              onPressed: () => _open('/app/tests/new'),
              icon: const Icon(AppIcons.add),
              label: const Text('Шинэ тест'),
            )
          : null,
      body: DataListScreen<StaffTestRow>(
        controller: _list,
        load: (q) async => DataPage.local(
          await ref.read(testAuthoringRepositoryProvider).staffTests(),
          q,
          matches: (t, s) => t.title.toLowerCase().contains(s) || t.classNames.any((n) => n.toLowerCase().contains(s)),
          inFilter: (t, f) => f == 'draft' ? t.isDraft : t.type == f,
          filters: _filters,
        ),
        itemKey: (t) => t.id,
        searchHint: 'Тест, ангиар хайх',
        filters: _filters,
        countLabel: (n) => '$n тест',
        emptyTitle: 'Тест алга',
        emptyMessage: 'Шинэ тест үүсгэнэ үү',
        itemBuilder: (_, t) {
          final editable = perms.canEditTest(t.createdById);
          return ItemRow(
            title: [t.title, if (t.variantLabel != null) '(${t.variantLabel})'].join(' '),
            meta: [
              TestTypes.label(t.type),
              '${t.problemCount} бодлого',
              if (t.resultCount > 0) '${t.resultCount} дүн',
              if (t.isDraft) 'Ноорог',
              if (t.classNames.isNotEmpty) t.classNames.join(', '),
            ],
            trailing: editable
                ? const Icon(AppIcons.pencilLine, semanticLabel: 'Засах')
                : const Icon(AppIcons.chart, semanticLabel: 'Дүн харах'),
          );
        },
        onTap: (t) => perms.canEditTest(t.createdById)
            ? _open('/app/tests/${Uri.encodeComponent(t.id)}/edit')
            : context.push('/app/teacher/tests/${Uri.encodeComponent(t.id)}/results', extra: t.title),
      ),
    );
  }
}
