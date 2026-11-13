import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/paper_exam_models.dart';
import '../data/paper_exams_repository.dart';
import '../domain/paper_exam_logic.dart';
import 'paper_ui.dart';

/// Удирдах эрх (үүсгэх, нийтлэх, импорт) — Багш+, Админ. Зөвхөн харагдац; эрх серверт.
bool paperCanManage(SessionState s) => s is SignedIn && (s.role == UserRole.admin || s.role == UserRole.teacherPlus);

/// Ажилтны «Нэгдсэн шалгалт» (`/app/paper-exams`, вэбийн `PaperExamsList`) — төвийн цаасан шалгалт
/// (OMR машин / Excel). Сурагч энэ замаар орвол «Шалгалт» хэсгийн өөрийн дүн рүү.
class PaperExamsListScreen extends ConsumerWidget {
  const PaperExamsListScreen({super.key});

  static const path = '/app/paper-exams';

  Future<void> _create(BuildContext context, WidgetRef ref, List<PaperExamRow> rows) async {
    final today = UbDateTime.now();
    final id = await showFormSheet<String>(
      context,
      title: 'Шинэ нэгдсэн шалгалт',
      submitLabel: 'Үүсгэх',
      fields: [
        FormTextField(
          name: 'title',
          label: 'Нэр',
          initial: nextTitle(rows.map((r) => r.title)),
          required: true,
          maxLength: 120,
          validator: (v) => v.length < 2 ? 'Нэр хэт богино байна' : null,
        ),
        FormDateField(name: 'heldOn', label: 'Огноо', initial: today, required: true),
        const FormNumberField(name: 'count', label: 'Бодлогын тоо', initial: 48, min: 1, max: 200, required: true),
      ],
      onSubmit: (v) => ref
          .read(paperExamsRepositoryProvider)
          .create(title: v.text('title'), heldOn: v.date('heldOn')!.dateKey, itemCount: v.integer('count')!),
    );
    if (id == null || id.isEmpty || !context.mounted) return;
    ref.invalidate(paperExamsProvider);
    await context.push('$path/${Uri.encodeComponent(id)}?tab=import');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final manage = paperCanManage(session);
    final async = ref.watch(paperExamsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Нэгдсэн шалгалт')),
      floatingActionButton: manage && async.hasValue
          ? FloatingActionButton.extended(
              key: const Key('paper-new'),
              onPressed: () => _create(context, ref, async.value!),
              icon: const Icon(AppIcons.add),
              label: const Text('Шинэ шалгалт'),
            )
          : null,
      body: async.when(
        skipLoadingOnRefresh: true,
        loading: () => const LoadingState(cards: 4),
        error: (e, _) => ErrorState(
          message: paperError(e, 'Жагсаалтыг ачаалж чадсангүй'),
          onRetry: () => ref.invalidate(paperExamsProvider),
        ),
        data: (rows) => RefreshIndicator(
          onRefresh: () => ref.refresh(paperExamsProvider.future),
          child: rows.isEmpty
              ? ListView(
                  children: [
                    SizedBox(
                      height: 420,
                      child: EmptyState(
                        icon: AppIcons.scan,
                        title: 'Нэгдсэн шалгалт алга',
                        message: manage
                            ? 'Шалгалт үүсгээд машины эсвэл Excel-ийн дүнгээ оруулна'
                            : 'Багш+ шалгалт үүсгэж дүн оруулсны дараа энд харагдана',
                      ),
                    ),
                  ],
                )
              : ListView.separated(
                  padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.gutter, AppSpace.gutter, 96),
                  itemCount: rows.length,
                  separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                  itemBuilder: (context, i) {
                    final r = rows[i];
                    return AppCard(
                      onTap: () => context.push('$path/${Uri.encodeComponent(r.id)}'),
                      child: ItemRow(
                        title: r.title,
                        meta: [
                          dayText(r.heldOn),
                          '${r.itemCount} бодлого',
                          '${r.sheetCount} сурагч',
                          if (r.areaCount < r.itemCount) 'агуулга ${r.areaCount}/${r.itemCount}',
                        ],
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: AppSpace.xs),
                          child: Wrap(
                            spacing: AppSpace.sm,
                            runSpacing: AppSpace.xs,
                            children: [
                              MetaChip(
                                label: r.published ? 'Сурагчид нээлттэй' : 'Нийтлээгүй',
                                tone: r.published ? ChipTone.success : ChipTone.neutral,
                              ),
                              if (manage && r.unmatchedCount > 0)
                                MetaChip(label: '${r.unmatchedCount} холбогдоогүй', tone: ChipTone.warning),
                              if (r.avgPct != null) PctBadge(pct: r.avgPct, prefix: 'дундаж'),
                            ],
                          ),
                        ),
                        chevron: true,
                      ),
                    );
                  },
                ),
        ),
      ),
    );
  }
}

/// Ажилтны «Шалгалт» дэлгэцийн AppBar-ын товч (вэбийн `/app/tests`-ийн «Нэгдсэн шалгалт» холбоос).
class PaperExamsEntryButton extends StatelessWidget {
  const PaperExamsEntryButton({super.key});

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: 'Нэгдсэн шалгалт',
    icon: const Icon(AppIcons.scan),
    onPressed: () => context.push(PaperExamsListScreen.path),
  );
}
