import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/format/person_name.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../application/teacher_providers.dart';
import '../application/visits_controller.dart';
import '../data/makeup_visits.dart';
import '../domain/board_logic.dart';
import 'board_card.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

// Нөхөлт (эзэн 2026-11-08) — вэбийн `GuestSection`, `StudentSearch`, `VisitNoteChip`.

/// Өөрийн ангийн самбар: тэр өдөр өөр ангид/406-д нөхсөн сурагч → нэрийн доорх шошго. Алдаа бол хоосон.
final homeBadgesProvider = FutureProvider.autoDispose.family<Map<String, VisitNote>, ClassDay>((ref, a) async {
  try {
    return visitNotesOf(await ref.watch(makeupVisitsRepositoryProvider).home(a.classId, a.date));
  } on ApiError {
    return const {};
  }
});

void _snack(BuildContext context, String message) {
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// Хадгалалтын алдааг snackbar-аар (нэг удаа).
void listenVisitErrors(WidgetRef ref, BuildContext context, VisitsArgs args) {
  ref.listen(visitsProvider(args).select((s) => s.saveError), (_, e) {
    if (e != null) _snack(context, e);
  });
}

/// «12-6 ангид нөхөж суусан» — утсан дээр богино («12-6-д нөхсөн»), таблетад бүтэн.
class VisitNoteChip extends StatelessWidget {
  const VisitNoteChip({super.key, required this.note, this.wide = false});

  final VisitNote note;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Tooltip(
      message: note.full,
      excludeFromSemantics: true,
      child: Semantics(
        label: note.full,
        excludeSemantics: true,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: c.brandBright.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(AppRadius.pill),
            border: Border.all(color: c.brandBright.withValues(alpha: 0.5)),
          ),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(TeacherIcons.arrowRightLeft, size: 12, color: c.brandSoft),
                const SizedBox(width: AppSpace.xs),
                Flexible(
                  child: Text(
                    wide ? note.full : note.short,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.labelSmall?.copyWith(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: c.brandSoft,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Ангийн нэрийн жижиг шошго («12-4»).
class ClassTag extends StatelessWidget {
  const ClassTag(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.brandBright.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(AppRadius.sm / 2),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
        child: Text(
          text,
          style: context.text.labelSmall?.copyWith(fontSize: 12, fontWeight: FontWeight.w700, color: c.brandSoft),
        ),
      ),
    );
  }
}

/// Нэрээр хайх: «Мишээл» гэж бичихэд тэр нэртэй БҮХ сурагч, овог нэр ба ангитайгаа. Багш хүүхдээс
/// «аль ангийнх вэ» гэж асуугаад зөвийг нь сонгоно.
class StudentSearchView extends ConsumerStatefulWidget {
  const StudentSearchView({super.key, required this.added, required this.busyId, required this.onAdd, this.blocked});

  final Set<String> added;
  final String? busyId;
  final ValueChanged<SearchHit> onAdd;

  /// Нэмэх боломжгүй шалтгаан (ж: энэ ангийн сурагч); null = болно.
  final String? Function(SearchHit)? blocked;

  @override
  ConsumerState<StudentSearchView> createState() => _StudentSearchViewState();
}

class _StudentSearchViewState extends ConsumerState<StudentSearchView> {
  static const _debounce = Duration(milliseconds: 250);
  final _text = TextEditingController();
  Timer? _timer;
  String _q = '';
  ({String q, List<SearchHit> hits})? _result;
  ({String q, String msg})? _error;

  @override
  void dispose() {
    _timer?.cancel();
    _text.dispose();
    super.dispose();
  }

  bool get _tooShort => _q.replaceAll(' ', '').length < 2;

  void _changed(String raw) {
    final q = raw.replaceAll(RegExp(r'\s+'), ' ').trim();
    setState(() => _q = q);
    _timer?.cancel();
    if (_tooShort) return;
    _timer = Timer(_debounce, () async {
      try {
        final hits = await ref.read(makeupVisitsRepositoryProvider).search(q);
        if (mounted) setState(() => _result = (q: q, hits: hits));
      } catch (e) {
        if (mounted) {
          setState(() => _error = (q: q, msg: e is ApiError && e.message.isNotEmpty ? e.message : 'Хайж чадсангүй'));
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ready = _result?.q == _q;
    final failed = _error?.q == _q && !ready;
    final hits = ready ? _result!.hits : const <SearchHit>[];
    final Widget body;
    if (_tooShort) {
      body = Text('Нэрийн эхний 2 үсгийг бичнэ үү', style: context.text.bodyMedium?.copyWith(color: c.inkDim));
    } else if (failed) {
      body = Text(_error!.msg, style: context.text.bodyMedium?.copyWith(color: c.error));
    } else if (!ready) {
      body = const LoadingState(cards: 3, padding: EdgeInsets.zero);
    } else if (hits.isEmpty) {
      body = Text('«$_q» нэртэй сурагч олдсонгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim));
    } else {
      body = Column(
        children: [
          for (final h in hits) ...[
            _HitRow(
              hit: h,
              added: widget.added.contains(h.id),
              blocked: widget.added.contains(h.id) ? null : widget.blocked?.call(h),
              busy: widget.busyId == h.id,
              onAdd: () => widget.onAdd(h),
            ),
            const SizedBox(height: AppSpace.xs),
          ],
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          key: const ValueKey('student-search'),
          controller: _text,
          autofocus: true,
          textInputAction: TextInputAction.search,
          style: const TextStyle(fontSize: 16),
          decoration: InputDecoration(
            prefixIcon: const Icon(AppIcons.search),
            hintText: 'Сурагчийн нэр, ж: Мишээл',
            suffixIcon: _q.isEmpty
                ? null
                : IconButton(
                    tooltip: 'Хайлтыг цэвэрлэх',
                    icon: const Icon(AppIcons.close, size: 18),
                    onPressed: () {
                      _text.clear();
                      _changed('');
                    },
                  ),
          ),
          onChanged: _changed,
        ),
        const SizedBox(height: AppSpace.sm),
        Semantics(liveRegion: true, child: body),
      ],
    );
  }
}

class _HitRow extends StatelessWidget {
  const _HitRow({
    required this.hit,
    required this.added,
    required this.blocked,
    required this.busy,
    required this.onAdd,
  });

  final SearchHit hit;
  final bool added;
  final String? blocked;
  final bool busy;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: c.line),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.xs),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    hit.full,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  hit.classes.isEmpty
                      ? Text('Ангигүй', style: context.text.bodySmall?.copyWith(color: c.inkDim))
                      : Wrap(
                          spacing: AppSpace.xs,
                          runSpacing: AppSpace.xs,
                          children: [for (final cl in hit.classes) ClassTag(shortClass(cl.name))],
                        ),
                ],
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            if (added)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(AppIcons.check, size: 16, color: c.success),
                  const SizedBox(width: AppSpace.xs),
                  Text('Нэмсэн', style: context.text.labelLarge?.copyWith(color: c.success)),
                ],
              )
            else if (blocked != null)
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 128),
                child: Text(
                  blocked!,
                  textAlign: TextAlign.right,
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
              )
            else
              FilledButton.icon(
                key: ValueKey('add-${hit.id}'),
                style: FilledButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                onPressed: busy ? null : onAdd,
                icon: busy
                    ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(AppIcons.add, size: 16),
                label: Text('Нэмэх', semanticsLabel: '${hit.full} нэмэх'),
              ),
          ],
        ),
      ),
    );
  }
}

/// Өөр ангиас нөхөж суусан сурагчид (эзэн 2026-11-08): зочилсон ангийн самбарын ХАМГИЙН ДООР,
/// энгийн сурагчийнхтай ИЖИЛ ирц/даалгаврын мөртэй, «12-4 ангиас» гэж тодорхой. Нэмэх товч
/// «Үлдсэнийг нэг дор»-ын доор.
class GuestSection extends ConsumerWidget {
  const GuestSection({
    super.key,
    required this.hostId,
    required this.hostName,
    required this.date,
    required this.today,
    required this.homework,
    required this.wide,
  });

  final String hostId;
  final String hostName;
  final String date;
  final String today;
  final bool homework;
  final bool wide;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final args = (place: hostId, date: date);
    listenVisitErrors(ref, context, args);
    final g = ref.watch(visitsProvider(args));
    final c = context.colors;
    final visits = g.visits ?? const <VisitView>[];
    final names = rosterNames([
      for (final v in visits)
        (id: v.student.id, firstName: v.student.firstName, lastName: v.student.lastName, role: null),
    ]);
    final future = date.compareTo(today) > 0;
    return Semantics(
      container: true,
      label: 'Нөхөж суусан сурагчид',
      explicitChildNodes: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (visits.isNotEmpty) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.xs, AppSpace.xs, AppSpace.xs, AppSpace.sm),
              child: Row(
                children: [
                  Icon(TeacherIcons.arrowRightLeft, size: 16, color: c.brand),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      'Өөр ангиас нөхөж суусан',
                      style: context.text.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                    ),
                  ),
                  const SizedBox(width: AppSpace.xs),
                  Text('(${visits.length})', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                ],
              ),
            ),
            for (final (i, v) in visits.indexed) ...[
              _GuestCard(
                key: ValueKey('guest-${v.id}'),
                args: args,
                visit: v,
                index: i + 1,
                name: names[v.student.id] ?? v.student.firstName,
                homework: homework,
                wide: wide,
              ),
              const SizedBox(height: AppSpace.sm),
            ],
          ],
          if (g.error != null && g.visits == null) ...[
            DecoratedBox(
              decoration: BoxDecoration(
                color: c.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.xs),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        'Нөхөж суусан сурагчдыг ачаалж чадсангүй',
                        style: context.text.bodyMedium?.copyWith(color: c.error),
                      ),
                    ),
                    TextButton(
                      style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                      onPressed: ref.read(visitsProvider(args).notifier).reload,
                      child: const Text(AppStrings.retry),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: AppSpace.sm),
          ],
          if (future)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.xs),
              child: Text(
                'Өөр ангиас нөхөж суусан сурагчийг хичээлийн өдөр нэмнэ',
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
            )
          else
            OutlinedButton.icon(
              key: const ValueKey('guest-add'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(teacherTap),
                foregroundColor: c.brandSoft,
                side: BorderSide(color: c.brand),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md)),
              ),
              onPressed: () => AddGuestSheet.open(context, hostId: hostId, hostName: hostName, date: date),
              icon: const Icon(TeacherIcons.userPlus, size: 16),
              label: const Text('Өөр ангиас нөхөж суусан сурагч нэмэх'),
            ),
        ],
      ),
    );
  }
}

class _GuestCard extends ConsumerWidget {
  const _GuestCard({
    super.key,
    required this.args,
    required this.visit,
    required this.index,
    required this.name,
    required this.homework,
    required this.wide,
  });

  final VisitsArgs args;
  final VisitView visit;
  final int index;
  final String name;
  final bool homework;
  final bool wide;

  Future<void> _remove(BuildContext context, WidgetRef ref) async {
    final ok = await confirmRemove(context, visit.student.full);
    if (!ok || !context.mounted) return;
    try {
      await ref.read(visitsProvider(args).notifier).remove(visit.id);
      if (context.mounted) _snack(context, '${visit.student.full} хасагдлаа');
    } catch (e) {
      if (context.mounted) _snack(context, e is ApiError && e.message.isNotEmpty ? e.message : 'Хасаж чадсангүй');
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final ctl = ref.read(visitsProvider(args).notifier);
    final v = visit;
    final inline = wide && MediaQuery.sizeOf(context).width >= boardInlineBreakpoint;
    final lateExtra = v.att == AttendanceStatus.late && v.lateRange != null ? lateRangeShort(v.lateRange!) : null;
    final from = v.homeClassroom == null ? 'Ангигүй сурагч' : '${shortClass(v.homeClassroom!.name)} ангиас';
    final preview = [
      v.attNote?.trim() ?? '',
      if (homework) v.hwNote?.trim() ?? '',
    ].where((t) => t.isNotEmpty).join(', ');
    final highlight =
        v.att == AttendanceStatus.late ||
        v.att == AttendanceStatus.absent ||
        v.att == AttendanceStatus.excused ||
        (homework && (v.hw == HomeworkStatus.partial || v.hw == HomeworkStatus.notDone));
    void openNote() => GuestNoteSheet.open(context, args: args, visitId: v.id, name: name, homework: homework);
    return DashedBox(
      radius: AppRadius.md,
      color: c.brandBright.withValues(alpha: 0.6),
      child: Padding(
        padding: const EdgeInsets.all(6),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: c.brandBright.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    border: Border.all(color: c.brandBright.withValues(alpha: 0.5)),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(TeacherIcons.arrowRightLeft, size: 13, color: c.brandSoft),
                        const SizedBox(width: AppSpace.xs),
                        Text(
                          from,
                          style: context.text.labelSmall?.copyWith(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: c.brandSoft,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Text(
                    v.student.full,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  ),
                ),
                IconButton(
                  tooltip: 'Жагсаалтаас хасах',
                  constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                  icon: Icon(AppIcons.trash, size: 18, color: c.inkDim),
                  onPressed: () => _remove(context, ref),
                ),
              ],
            ),
            Row(
              children: [
                SizedBox(
                  width: 20,
                  child: Text(
                    '$index',
                    style: context.text.labelSmall?.copyWith(
                      color: c.inkDim,
                      fontSize: 12,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                ),
                Expanded(
                  child: Semantics(
                    button: true,
                    label: '$name, сурагчийн мэдээлэл',
                    excludeSemantics: true,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      onTap: () => context.push('/app/students/${Uri.encodeComponent(v.student.id)}', extra: name),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: teacherTap),
                        child: Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
                if (preview.isNotEmpty)
                  Expanded(
                    child: Text(
                      preview,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                  ),
                Semantics(
                  button: true,
                  label: 'Тэмдэглэл нээх, $name',
                  excludeSemantics: true,
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    onTap: openNote,
                    child: SizedBox.square(
                      dimension: teacherTap,
                      child: Icon(AppIcons.overflow, size: 20, color: highlight ? c.brand : c.inkDim),
                    ),
                  ),
                ),
              ],
            ),
            BoardMarkRow(
              label: 'Ирц',
              icon: TeacherIcons.userCheck,
              labelColor: c.brand,
              background: c.brandBright.withValues(alpha: 0.07),
              semanticsLabel: 'Ирц, $name',
              wide: wide,
              inline: inline,
              lines: lateExtra != null && !inline ? 2 : 1,
              children: [
                for (final a in AttendanceStatus.values)
                  BoardMarkBox(
                    key: ValueKey('gatt-${v.id}-${a.name}'),
                    meta: attendanceMeta(a),
                    selected: v.att == a,
                    extra: a == AttendanceStatus.late ? lateExtra : null,
                    wide: inline,
                    onTap: () {
                      final next = v.att == a ? null : a;
                      ctl.setAtt(v.id, next);
                      if (next == AttendanceStatus.late ||
                          next == AttendanceStatus.absent ||
                          next == AttendanceStatus.excused) {
                        openNote();
                      }
                    },
                  ),
              ],
            ),
            if (homework) ...[
              const SizedBox(height: AppSpace.xs),
              BoardMarkRow(
                label: 'Даалгавар',
                icon: AppIcons.homework,
                labelColor: c.inkDim,
                background: c.ink.withValues(alpha: 0.05),
                semanticsLabel: 'Даалгавар, $name',
                wide: wide,
                inline: inline,
                children: [
                  for (final h in HomeworkStatus.values)
                    BoardMarkBox(
                      key: ValueKey('ghw-${v.id}-${h.name}'),
                      meta: homeworkMeta(h),
                      selected: v.hw == h,
                      wide: inline,
                      onTap: () {
                        final next = v.hw == h ? null : h;
                        ctl.setHw(v.id, next);
                        if (next == HomeworkStatus.partial || next == HomeworkStatus.notDone) openNote();
                      },
                    ),
                  OnlineBoxButton(
                    kind: OnlineBox.placeholder,
                    wide: inline,
                    label: 'Онлайн гэрийн даалгавар алга',
                    onTap: () {},
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Хасахаас өмнө асууна (сервер зөөлөн устгана, түүх үлдэнэ).
Future<bool> confirmRemove(BuildContext context, String who) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('$who-г жагсаалтаас хасах уу'),
      actions: [
        TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text(AppStrings.cancel)),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: ctx.colors.error, foregroundColor: ctx.colors.onStatus),
          onPressed: () => Navigator.of(ctx).pop(true),
          child: const Text('Хасах'),
        ),
      ],
    ),
  );
  return ok ?? false;
}

/// Нөхөж суусан сурагчийн хоцролтын хугацаа, шалтгаан, тэмдэглэл (самбарын «⋯»-тэй ижил).
class GuestNoteSheet extends ConsumerStatefulWidget {
  const GuestNoteSheet({
    super.key,
    required this.args,
    required this.visitId,
    required this.name,
    required this.homework,
  });

  final VisitsArgs args;
  final String visitId;
  final String name;
  final bool homework;

  static Future<void> open(
    BuildContext context, {
    required VisitsArgs args,
    required String visitId,
    required String name,
    required bool homework,
  }) async {
    final container = ProviderScope.containerOf(context, listen: false);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => GuestNoteSheet(args: args, visitId: visitId, name: name, homework: homework),
    );
    if (container.exists(visitsProvider(args))) container.read(visitsProvider(args).notifier).flushTyped();
  }

  @override
  ConsumerState<GuestNoteSheet> createState() => _GuestNoteSheetState();
}

class _GuestNoteSheetState extends ConsumerState<GuestNoteSheet> {
  late final TextEditingController _att;
  late final TextEditingController _hw;

  VisitsController get _ctl => ref.read(visitsProvider(widget.args).notifier);

  @override
  void initState() {
    super.initState();
    final v = _ctl.byId(widget.visitId);
    _att = TextEditingController(text: v?.attNote ?? '');
    _hw = TextEditingController(text: v?.hwNote ?? '');
  }

  @override
  void dispose() {
    _att.dispose();
    _hw.dispose();
    super.dispose();
  }

  void _pickAtt(String r) {
    final next = _att.text.trim() == r ? '' : r;
    _att.text = next;
    _ctl.setAttNote(widget.visitId, next, typed: false);
  }

  void _pickHw(String r) {
    final next = _hw.text.trim() == r ? '' : r;
    _hw.text = next;
    _ctl.setHwNote(widget.visitId, next, typed: false);
  }

  @override
  Widget build(BuildContext context) {
    final v = ref.watch(
      visitsProvider(widget.args).select((s) => s.visits?.where((x) => x.id == widget.visitId).firstOrNull),
    );
    if (v == null) return const SizedBox(height: 120);
    final c = context.colors;
    final reasons = reasonsForAttendance(v.att);
    final hwReasons = v.hw == HomeworkStatus.partial || v.hw == HomeworkStatus.notDone;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.name, style: context.text.titleMedium),
            const SizedBox(height: AppSpace.md),
            Text('Ирц', style: context.text.labelLarge),
            const SizedBox(height: AppSpace.xs),
            AttendanceMarkView(status: v.att, lateRange: v.lateRange),
            if (v.att == AttendanceStatus.late) ...[
              const SizedBox(height: AppSpace.md),
              Text('Хэр хоцорсон бэ', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
              const SizedBox(height: AppSpace.xs),
              Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.sm,
                children: [
                  for (final r in LateRange.values)
                    ChoiceChip(
                      label: Text(lateRangeLabel(r)),
                      selected: v.lateRange == r,
                      materialTapTargetSize: MaterialTapTargetSize.padded,
                      onSelected: (on) => _ctl.setLateRange(widget.visitId, on ? r : null),
                    ),
                ],
              ),
            ],
            if (reasons.isNotEmpty) ...[
              const SizedBox(height: AppSpace.md),
              Text(
                v.att == AttendanceStatus.excused ? 'Чөлөөний шалтгаан' : 'Тасалсан шалтгаан',
                style: context.text.bodySmall?.copyWith(color: c.inkDim),
              ),
              const SizedBox(height: AppSpace.xs),
              Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.sm,
                children: [
                  for (final r in reasons)
                    ChoiceChip(
                      label: Text(r),
                      selected: (v.attNote ?? '').trim() == r,
                      materialTapTargetSize: MaterialTapTargetSize.padded,
                      onSelected: (_) => _pickAtt(r),
                    ),
                ],
              ),
            ],
            const SizedBox(height: AppSpace.md),
            TextField(
              controller: _att,
              enabled: v.att != null,
              maxLength: noteMax,
              minLines: 1,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: 'Ирцийн тэмдэглэл',
                helperText: v.att == null ? 'Ирцийг тэмдэглэсний дараа бичнэ' : null,
              ),
              onChanged: (t) => _ctl.setAttNote(widget.visitId, t, typed: true),
            ),
            if (widget.homework) ...[
              const SizedBox(height: AppSpace.lg),
              Text('Даалгавар', style: context.text.labelLarge),
              const SizedBox(height: AppSpace.xs),
              HomeworkMarkView(status: v.hw),
              if (hwReasons) ...[
                const SizedBox(height: AppSpace.md),
                Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.sm,
                  children: [
                    for (final r in homeworkReasons)
                      ChoiceChip(
                        label: Text(r),
                        selected: (v.hwNote ?? '').trim() == r,
                        materialTapTargetSize: MaterialTapTargetSize.padded,
                        onSelected: (_) => _pickHw(r),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: AppSpace.md),
              TextField(
                controller: _hw,
                maxLength: noteMax,
                minLines: 1,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Даалгаврын тэмдэглэл'),
                onChanged: (t) => _ctl.setHwNote(widget.visitId, t, typed: true),
              ),
            ],
            const SizedBox(height: AppSpace.sm),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size(120, teacherTap)),
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Болсон'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Өөр ангийн сурагчийг энэ ангийн хичээлд нөхөж суусан гэж нэмэх (нэрээр хайж).
class AddGuestSheet extends ConsumerStatefulWidget {
  const AddGuestSheet({super.key, required this.hostId, required this.hostName, required this.date});

  final String hostId;
  final String hostName;
  final String date;

  static Future<void> open(
    BuildContext context, {
    required String hostId,
    required String hostName,
    required String date,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => FractionallySizedBox(
      heightFactor: 0.88,
      child: AddGuestSheet(hostId: hostId, hostName: hostName, date: date),
    ),
  );

  @override
  ConsumerState<AddGuestSheet> createState() => _AddGuestSheetState();
}

class _AddGuestSheetState extends ConsumerState<AddGuestSheet> {
  String? _busyId;

  VisitsArgs get _args => (place: widget.hostId, date: widget.date);

  Future<void> _add(SearchHit hit) async {
    setState(() => _busyId = hit.id);
    try {
      final r = await ref
          .read(makeupVisitsRepositoryProvider)
          .create(date: widget.date, hostClassId: widget.hostId, studentIds: [hit.id]);
      if (!mounted) return;
      if (r.created.isNotEmpty) {
        ref.read(visitsProvider(_args).notifier).add(r.created);
        _snack(context, '${hit.full} нэмэгдлээ');
      } else if (r.skipped.isNotEmpty) {
        _snack(context, '${hit.full}: ${skipText(r.skipped.first)}');
      }
    } catch (e) {
      if (mounted) _snack(context, e is ApiError && e.message.isNotEmpty ? e.message : 'Нэмж чадсангүй');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final host = shortClass(widget.hostName);
    final added = {for (final v in ref.watch(visitsProvider(_args)).visits ?? const <VisitView>[]) v.student.id};
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Нөхөж суусан сурагч нэмэх', style: context.text.titleMedium),
                const SizedBox(height: 2),
                Text(
                  'Өөр ангийн сурагч $host ангийн хичээлд сууж нөхөж байна. Ижил нэртэй бол ангийг нь асууж сонгоно уу',
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.md),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              child: StudentSearchView(
                added: added,
                busyId: _busyId,
                onAdd: _add,
                blocked: (h) => h.classes.any((cl) => cl.id == widget.hostId) ? '$host ангийн сурагч' : null,
              ),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
              child: OutlinedButton(
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                onPressed: () => Navigator.of(context).pop(),
                child: const Text('Болсон'),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
