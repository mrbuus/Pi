import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../application/staff_providers.dart';
import '../application/teacher_providers.dart';
import '../data/staff_models.dart';
import '../data/staff_repository.dart';
import 'staff_widgets.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

/// «Ангийн бусад мэдээлэл» (вэбийн `OtherInfo`): өдрийн дүгнэлт, анхаарах сурагчид, Багш+/Админд эцэг эхийн
/// холболтын хүсэлт. Нээх хүртэл юу ч ачаалахгүй.
class BoardOtherInfo extends ConsumerStatefulWidget {
  const BoardOtherInfo({super.key, required this.classId, required this.date});

  final String classId;
  final String date;

  @override
  ConsumerState<BoardOtherInfo> createState() => _BoardOtherInfoState();
}

class _BoardOtherInfoState extends ConsumerState<BoardOtherInfo> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Semantics(
            button: true,
            expanded: _open,
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.md),
              onTap: () => setState(() => _open = !_open),
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: teacherTap),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
                  child: Row(
                    children: [
                      Icon(TeacherIcons.listChecks, color: c.brand),
                      const SizedBox(width: AppSpace.md),
                      Expanded(child: Text('Ангийн бусад мэдээлэл', style: context.text.titleSmall)),
                      Icon(_open ? AppIcons.expand : AppIcons.forward, color: c.inkDim),
                    ],
                  ),
                ),
              ),
            ),
          ),
          if (_open)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.lg),
              child: _Body(args: (classId: widget.classId, date: widget.date)),
            ),
        ],
      ),
    );
  }
}

class _Body extends ConsumerWidget {
  const _Body({required this.args});

  final ClassDay args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final manage = ref.watch(canManageProvider);
    final today = ref.watch(teacherTodayProvider);
    // Өдрийн дүгнэлт шөнө 23:30-д бодогддог — өнөөдрийнхийг түүнээс өмнө асуувал 400 (вэбтэй ижил алгасна).
    final skipSummary = args.date == today.dateKey && today.hour * 60 + today.minute < 23 * 60 + 35;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (!skipSummary) ...[_SummaryBlock(args: args), const SizedBox(height: AppSpace.lg)],
        _AttentionBlock(args: args),
        if (manage) ...[const SizedBox(height: AppSpace.lg), const ParentRequestsBlock()],
      ],
    );
  }
}

class _SummaryBlock extends ConsumerWidget {
  const _SummaryBlock({required this.args});

  final ClassDay args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(dailySummaryProvider(args));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Өдрийн дүгнэлт', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        async.when(
          skipLoadingOnRefresh: false,
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => InlineError(
            message: errorText(e, 'Дүгнэлт нээгдсэнгүй'),
            onRetry: () => ref.invalidate(dailySummaryProvider(args)),
          ),
          data: (s) => s == null
              ? Text(
                  'Дүгнэлт хараахан бодогдоогүй, шөнө автоматаар бодогдоно',
                  style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                )
              : Meta(items: ['Тэмдэглэсэн ${s.marked}/${s.total} сурагч', 'нийт ${s.attempts} бодлого']),
        ),
      ],
    );
  }
}

class _AttentionBlock extends ConsumerWidget {
  const _AttentionBlock({required this.args});

  final ClassDay args;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(classAttentionProvider(args));
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Анхаарах сурагчид', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        async.when(
          skipLoadingOnRefresh: false,
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => InlineError(
            message: errorText(e, 'Анхаарах жагсаалт нээгдсэнгүй'),
            onRetry: () => ref.invalidate(classAttentionProvider(args)),
          ),
          data: (a) {
            if (a.rows.isEmpty) {
              return Row(
                children: [
                  Icon(AppIcons.success, size: 18, color: c.success),
                  const SizedBox(width: AppSpace.sm),
                  const Expanded(child: Text('Одоогоор онцгой анхаарах сурагч алга')),
                ],
              );
            }
            return Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Ирц ба ${a.windowDays} өдрийн оройн тэмдэглэгээ, ${a.flagged}/${a.students}',
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
                const SizedBox(height: AppSpace.sm),
                for (final row in a.rows.take(12)) ...[
                  Text(row.name, style: context.text.titleSmall),
                  const SizedBox(height: AppSpace.xs),
                  Wrap(
                    spacing: AppSpace.xs,
                    runSpacing: AppSpace.xs,
                    children: [
                      for (final f in row.flags)
                        Pill(
                          icon: f.danger ? AppIcons.error : AppIcons.warning,
                          label: f.title,
                          color: f.danger ? c.error : c.warning,
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.xs),
                  Text(
                    row.flags.map((f) => f.detail).where((d) => d.isNotEmpty).join(', '),
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  ),
                  const SizedBox(height: AppSpace.md),
                ],
                if (a.rows.length > 12)
                  Text('ба өөр ${a.rows.length - 12} сурагч', style: context.text.bodySmall),
              ],
            );
          },
        ),
      ],
    );
  }
}

/// Эцэг эхийн холболтын хүсэлт: батлах, цуцлах (Багш+, Админ). Хоёр үйлдэл серверт шууд хадгалагдана.
class ParentRequestsBlock extends ConsumerStatefulWidget {
  const ParentRequestsBlock({super.key});

  @override
  ConsumerState<ParentRequestsBlock> createState() => _ParentRequestsBlockState();
}

class _ParentRequestsBlockState extends ConsumerState<ParentRequestsBlock> {
  String? _busy;
  String? _msg;

  Future<void> _act(ParentLinkRequest r, bool approve) async {
    setState(() {
      _busy = r.id;
      _msg = null;
    });
    final repo = ref.read(staffRepositoryProvider);
    try {
      await (approve ? repo.verifyParentLink(r.id) : repo.rejectParentLink(r.id));
      _msg = approve ? 'Эцэг эхийн холболт баталгаажлаа' : 'Холболтын хүсэлт цуцлагдлаа';
      ref.invalidate(pendingParentLinksProvider);
    } catch (e) {
      _msg = errorText(e, 'Үйлдэл амжилтгүй боллоо, дахин оролдоно уу');
    }
    if (mounted) setState(() => _busy = null);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(pendingParentLinksProvider);
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Эцэг эхийн холболтын хүсэлт', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        if (_msg != null) ...[
          Semantics(liveRegion: true, child: Text(_msg!, style: context.text.bodySmall)),
          const SizedBox(height: AppSpace.sm),
        ],
        async.when(
          skipLoadingOnRefresh: false,
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => InlineError(
            message: errorText(e, 'Хүсэлтүүд нээгдсэнгүй'),
            onRetry: () => ref.invalidate(pendingParentLinksProvider),
          ),
          data: (list) => list.isEmpty
              ? Text('Хүлээгдэж буй хүсэлт алга', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
              : Column(
                  children: [
                    for (final r in list) ...[
                      _RequestTile(request: r, busy: _busy == r.id, onAct: (ok) => _act(r, ok)),
                      const SizedBox(height: AppSpace.sm),
                    ],
                  ],
                ),
        ),
      ],
    );
  }
}

class _RequestTile extends StatelessWidget {
  const _RequestTile({required this.request, required this.busy, required this.onAct});

  final ParentLinkRequest request;
  final bool busy;
  final ValueChanged<bool> onAct;

  @override
  Widget build(BuildContext context) {
    final r = request;
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.all(AppSpace.md),
      decoration: BoxDecoration(border: Border.all(color: c.line), borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(r.parentName, style: context.text.titleSmall),
          if (r.parentPhone != null) Text(r.parentPhone!, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          const SizedBox(height: AppSpace.sm),
          Text('Хүүхэд: ${r.studentName}', style: context.text.bodyMedium),
          Meta(
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
            items: [r.studentPhone, r.grade == null ? null : '${r.grade}-р анги'],
          ),
          const SizedBox(height: AppSpace.md),
          Row(
            children: [
              Expanded(
                child: FilledButton.icon(
                  style: FilledButton.styleFrom(minimumSize: const Size(0, teacherTap)),
                  onPressed: busy ? null : () => onAct(true),
                  icon: const Icon(AppIcons.check, size: 18),
                  label: const Text('Батлах'),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(minimumSize: const Size(0, teacherTap)),
                  onPressed: busy ? null : () => onAct(false),
                  icon: const Icon(AppIcons.close, size: 18),
                  label: const Text('Цуцлах'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
