import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../application/student_calendar_providers.dart';
import '../application/teacher_providers.dart' show errorText;
import '../data/student_calendar_models.dart';
import '../domain/student_calendar_logic.dart';

/// «Сэдэв хөтөлбөр» (вэб 2026-11-08): сурагчийн ангийн хөтөлбөр (100V3 → 200V3), тест бүрийг энэ сурагч
/// хийсэн эсэх, хэзээ, хаана. Дүрэм серверт (`api/src/student-calendar/syllabus.logic.ts`). Зөвхөн ажилтанд.
class StudentSyllabusTab extends ConsumerStatefulWidget {
  const StudentSyllabusTab({super.key, required this.studentId});

  final String studentId;

  @override
  ConsumerState<StudentSyllabusTab> createState() => _StudentSyllabusTabState();
}

class _StudentSyllabusTabState extends ConsumerState<StudentSyllabusTab> {
  bool _onlyMissing = false;
  bool _showTodo = false;

  static const _hint =
      'Ангид орсон сэдэв тасалснаас (чөлөөтэйг оруулаад) бусад тохиолдолд хийсэнд тооцогдоно. Анги солиход шинэ анги '
      'түрүүлж үзсэн сэдэв нөхөх хүртэл дутуу. 406 эсвэл өөр ангид нөхвөл хийсэнд орно';

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(studentSyllabusProvider(widget.studentId));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(cards: 3),
      error: (e, _) => ErrorState(
        message: errorText(e, 'Сэдэв хөтөлбөр нээгдсэнгүй'),
        onRetry: () => ref.invalidate(studentSyllabusProvider(widget.studentId)),
      ),
      data: _body,
    );
  }

  Widget _body(SyllabusResponse d) {
    final c = context.colors;
    final books = filterSyllabus(d.books, onlyMissing: _onlyMissing, showTodo: _showTodo);
    final other = [
      for (final t in d.other)
        if (keepSyllabusTest(t, onlyMissing: _onlyMissing, showTodo: _showTodo)) t,
    ];
    final missing = d.missing > 0;
    final tone = missing ? c.warning : c.success;
    Widget check(String label, bool value, ValueChanged<bool> onChanged) => InkWell(
      onTap: () => onChanged(!value),
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: AppSizes.minTap),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Checkbox(value: value, onChanged: (v) => onChanged(v ?? false)),
            Flexible(child: Text(label, style: context.text.bodyMedium)),
            const SizedBox(width: AppSpace.sm),
          ],
        ),
      ),
    );

    return RefreshIndicator(
      onRefresh: () => ref.refresh(studentSyllabusProvider(widget.studentId).future).then((_) {}, onError: (_) {}),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          Row(
            children: [
              Text('Сэдэв хөтөлбөр', style: context.text.titleSmall),
              const InfoHint(title: 'Сэдэв хөтөлбөр', message: _hint),
              Expanded(
                child: Meta(
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  items: [d.classroomName ?? 'Ангигүй', '${d.done} хийсэн'],
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
            decoration: BoxDecoration(
              border: Border.all(color: tone),
              borderRadius: BorderRadius.circular(AppRadius.sm),
            ),
            child: Row(
              children: [
                Icon(missing ? AppIcons.error : AppIcons.success, size: 18, color: tone),
                const SizedBox(width: AppSpace.sm),
                Text(
                  missing ? 'Дутуу ${d.missing} сэдэв' : 'Дутуу сэдэв алга',
                  style: context.text.titleSmall?.copyWith(color: tone),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            children: [
              check('Зөвхөн дутуу', _onlyMissing, (v) => setState(() => _onlyMissing = v)),
              if (!_onlyMissing) check('Үзээгүй сэдвийг харуулах', _showTodo, (v) => setState(() => _showTodo = v)),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          if (books.isEmpty && other.isEmpty)
            SizedBox(
              height: 220,
              child: EmptyState(
                icon: AppIcons.checklist,
                title: _onlyMissing ? 'Дутуу сэдэв алга' : 'Хийсэн сэдэв хараахан алга',
                message: 'Анги тест хийж, хичээл батлахад энд гарна',
              ),
            )
          else ...[
            for (final b in books) ...[
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.xs),
                child: Text(b.title, style: context.text.titleSmall),
              ),
              AppCard(
                padding: EdgeInsets.zero,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final ch in b.chapters) ...[
                      Padding(
                        padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, 0),
                        child: Text(
                          ch.title,
                          style: context.text.labelMedium?.copyWith(color: c.inkDim, fontWeight: FontWeight.w600),
                        ),
                      ),
                      for (final t in ch.tests) SyllabusTestTile(test: t),
                    ],
                  ],
                ),
              ),
            ],
            if (other.isNotEmpty) ...[
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.md, bottom: AppSpace.xs),
                child: Text('Бусад сэдэв', style: context.text.titleSmall),
              ),
              AppCard(
                padding: EdgeInsets.zero,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [for (final t in other) SyllabusTestTile(test: t)],
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}

/// Нэг сэдэв: төлөвийн дүрс, нэр (хувилбар), товч; дарахад үйл явдлууд (хэзээ, хаана, хэн).
class SyllabusTestTile extends StatefulWidget {
  const SyllabusTestTile({super.key, required this.test});

  final SyllabusTest test;

  @override
  State<SyllabusTestTile> createState() => _SyllabusTestTileState();
}

class _SyllabusTestTileState extends State<SyllabusTestTile> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final t = widget.test;
    final (icon, color, label) = switch (t.status) {
      SyllabusStatus.done => (AppIcons.success, c.success, 'Хийсэн'),
      SyllabusStatus.missing => (AppIcons.error, c.warning, 'Дутуу'),
      SyllabusStatus.todo => (AppIcons.circleDashed, c.inkDim.withValues(alpha: 0.6), 'Үзээгүй'),
    };
    final summary = syllabusSummary(t);
    final makeups = t.events.where((e) => e.kind == SyllabusEventKind.makeup);
    final small = context.text.bodySmall?.copyWith(color: c.inkDim);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          button: t.events.isNotEmpty,
          expanded: t.events.isEmpty ? null : _open,
          child: InkWell(
            onTap: t.events.isEmpty ? null : () => setState(() => _open = !_open),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
                child: Row(
                  children: [
                    Semantics(
                      label: label,
                      child: Icon(icon, size: 18, color: color),
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text.rich(
                            TextSpan(
                              children: [
                                TextSpan(text: t.title),
                                if (t.variant != null)
                                  TextSpan(
                                    text: '  ${t.variant}',
                                    style: small?.copyWith(fontWeight: FontWeight.w400),
                                  ),
                              ],
                            ),
                            style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (summary != null)
                            Text(summary, style: small, maxLines: 1, overflow: TextOverflow.ellipsis),
                        ],
                      ),
                    ),
                    if (makeups.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(left: AppSpace.xs),
                        child: Semantics(
                          label: 'Нөхсөн',
                          child: Icon(
                            makeups.any((e) => e.place?.room406 ?? false) ? AppIcons.doorOpen : AppIcons.repeat,
                            size: 16,
                            color: c.brand,
                          ),
                        ),
                      ),
                    if (t.events.isNotEmpty)
                      AnimatedRotation(
                        turns: _open ? 0.5 : 0,
                        duration: const Duration(milliseconds: 150),
                        child: Icon(AppIcons.expand, size: 16, color: c.inkDim),
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
        if (_open)
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.lg + 26, 0, AppSpace.lg, AppSpace.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final e in t.events)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpace.xs),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          syllabusEventText(e),
                          style: context.text.bodyMedium?.copyWith(color: e.done ? c.ink : c.warning),
                        ),
                        if (e.kind == SyllabusEventKind.classLesson &&
                            (e.lead != null || e.description != null || e.teacherNote != null))
                          Meta(style: small, items: [e.lead, e.description, e.teacherNote]),
                        if (e.kind == SyllabusEventKind.makeup && (e.teacher != null || e.comment != null))
                          Meta(style: small, items: [e.teacher, e.comment]),
                      ],
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
