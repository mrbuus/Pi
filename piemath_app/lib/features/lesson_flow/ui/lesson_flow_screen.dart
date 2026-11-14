import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/files/files.dart';
import '../../../core/math/math_text.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/lesson_flow_models.dart';
import '../data/lesson_flow_repository.dart';

/// Хичээлийн өдөр (`/app/lesson-flow`, вэбийн `app/lesson-flow/page.tsx`): онол → ангид хийсэн тест →
/// багшийн тохируулсан гэрийн даалгавар, зураг авах ээлж. Админ, Багш+, Багш (өөрийн анги).
///
/// Анги, өдөр, сэдвээ сонгомогц өдрийн мэдээлэл шууд нээгдэнэ (вэбийн «нээх» товчгүй). Тест бүртгэх, даалгавар
/// хадгалах, ээлж батлах нь доороос гарах хуудсаар; хадгалсны дараа серверээс дахин уншина.
class LessonFlowScreen extends ConsumerStatefulWidget {
  const LessonFlowScreen({super.key, this.today});

  static const path = '/app/lesson-flow';

  /// Тест: «өнөөдөр». Өгөөгүй бол [UbDateTime.now].
  final UbDateTime? today;

  @override
  ConsumerState<LessonFlowScreen> createState() => _LessonFlowScreenState();
}

class _LessonFlowScreenState extends ConsumerState<LessonFlowScreen> {
  FlowClass? _class;
  FlowChapter? _chapter;
  late UbDateTime _date = (widget.today ?? UbDateTime.now()).startOfDay;

  FlowKey? get _key =>
      _class == null || _chapter == null ? null : (classId: _class!.id, date: _date.dateKey, chapterId: _chapter!.id);

  Future<void> _pickClass(List<FlowClass> classes) async {
    final picked = await showSelectSheet<String>(
      context,
      title: 'Анги',
      selected: _class?.id,
      options: [for (final c in classes) SelectOption(c.id, c.name)],
    );
    if (picked == null || !mounted) return;
    setState(() => _class = classes.firstWhere((c) => c.id == picked.value));
  }

  Future<void> _pickChapter(List<FlowChapter> chapters) async {
    final picked = await showSelectSheet<String>(
      context,
      title: 'Сэдэв',
      selected: _chapter?.id,
      options: [for (final c in chapters) SelectOption(c.id, c.title, subtitle: c.book)],
    );
    if (picked == null || !mounted) return;
    setState(() => _chapter = chapters.firstWhere((c) => c.id == picked.value));
  }

  Future<void> _pickDate() async {
    final today = (widget.today ?? UbDateTime.now()).startOfDay;
    DateTime local(UbDateTime d) => DateTime(d.year, d.month, d.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: local(_date),
      firstDate: local(today.addDays(-365)),
      lastDate: local(today.addDays(60)),
      currentDate: local(today),
      helpText: 'Өдөр',
      cancelText: AppStrings.cancel,
      confirmText: 'Сонгох',
    );
    if (picked == null || !mounted) return;
    setState(() => _date = UbDateTime(picked.year, picked.month, picked.day));
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final role = session is SignedIn ? session.role : UserRole.unknown;
    final userId = session is SignedIn ? session.auth.userId : null;
    final staff = role == UserRole.admin || role == UserRole.teacherPlus || role == UserRole.teacher;
    final key = _key;
    final preview = key == null ? null : ref.watch(lessonFlowPreviewProvider(key));
    final limits = preview?.value?.limitations ?? const <String>[];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Хичээлийн өдөр'),
        actions: [if (limits.isNotEmpty) InfoHint(title: 'Тоо юуг харуулдаг вэ', message: limits.join('\n\n'))],
      ),
      body: !staff
          ? const EmptyState(
              icon: AppIcons.shield,
              title: 'Энэ хэсэг багш нарт',
              message: 'Хичээлийн өдрийг ангийн багш, Багш+ удирдана',
            )
          : RefreshIndicator(
              onRefresh: () {
                ref
                  ..invalidate(lessonFlowClassesProvider)
                  ..invalidate(lessonFlowChaptersProvider);
                return key == null ? Future<void>.value() : ref.refresh(lessonFlowPreviewProvider(key).future);
              },
              child: CustomScrollView(
                key: const ValueKey('lesson-flow'),
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
                    sliver: SliverToBoxAdapter(
                      child: _Selection(
                        role: role,
                        userId: userId,
                        selectedClass: _class,
                        chapter: _chapter,
                        date: _date,
                        onClass: _pickClass,
                        onChapter: _pickChapter,
                        onDate: _pickDate,
                      ),
                    ),
                  ),
                  if (key == null)
                    const SliverFillRemaining(
                      hasScrollBody: false,
                      child: EmptyState(
                        icon: AppIcons.theory,
                        title: 'Анги, сэдвээ сонгоно уу',
                        message: 'Онол, ангид хийсэн тест, гэрийн даалгавар нэг дор',
                      ),
                    )
                  else
                    ...switch (preview!) {
                      AsyncValue(value: final p?) => _sections(context, key, p),
                      AsyncValue(error: final e?) => [
                        SliverFillRemaining(
                          hasScrollBody: false,
                          child: ErrorState(
                            message: e is ApiError ? e.message : AppStrings.genericError,
                            onRetry: () => ref.invalidate(lessonFlowPreviewProvider(key)),
                          ),
                        ),
                      ],
                      _ => [const SliverToBoxAdapter(child: LoadingState(cards: 3))],
                    },
                ],
              ),
            ),
    );
  }

  List<Widget> _sections(BuildContext context, FlowKey key, FlowPreview p) {
    final n = p.counters.classSize;
    Widget pad(Widget child) => SliverPadding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
      sliver: SliverToBoxAdapter(child: child),
    );
    return [
      pad(
        Padding(
          padding: const EdgeInsets.only(top: AppSpace.lg),
          child: StatRow(
            tiles: [
              StatTile(label: 'Анги', value: '$n', hint: 'сурагч', icon: AppIcons.students),
              StatTile(
                label: 'Онолын зураг',
                value: p.counters.theorySubmitted == null ? '0/$n' : '${p.counters.theorySubmitted}/$n',
                hint: p.counters.theorySubmitted == null ? 'багц хадгалаагүй' : null,
                icon: AppIcons.theoryPhoto,
              ),
              StatTile(label: 'Ангийн тест', value: '${p.counters.classTestSubmitted}/$n', icon: AppIcons.tests),
              StatTile(label: 'Даалгавар', value: '${p.counters.homeworkSubmitted}/$n', icon: AppIcons.homework),
            ],
          ),
        ),
      ),
      pad(_TestCard(flowKey: key, preview: p)),
      pad(_HomeworkCard(flowKey: key, preview: p)),
      pad(_TurnCard(flowKey: key, preview: p)),
      if (p.theories.isNotEmpty) pad(_TheoryCard(preview: p)),
      pad(_AttendanceCard(preview: p)),
      pad(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpace.lg),
          child: AppCard(
            padding: EdgeInsets.zero,
            child: ListTile(
              minTileHeight: AppSizes.minTap,
              leading: const Icon(AppIcons.checklist),
              title: const Text('Багшийн самбар'),
              subtitle: const Text('Ирц ба хавсралт'),
              trailing: const Icon(AppIcons.forward),
              onTap: () => unawaited(context.push('/app/teacher')),
            ),
          ),
        ),
      ),
      const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl)),
    ];
  }
}

/// Анги, өдөр, сэдвийн сонголт.
class _Selection extends ConsumerWidget {
  const _Selection({
    required this.role,
    required this.userId,
    required this.selectedClass,
    required this.chapter,
    required this.date,
    required this.onClass,
    required this.onChapter,
    required this.onDate,
  });

  final UserRole role;
  final String? userId;
  final FlowClass? selectedClass;
  final FlowChapter? chapter;
  final UbDateTime date;
  final Future<void> Function(List<FlowClass>) onClass;
  final Future<void> Function(List<FlowChapter>) onChapter;
  final Future<void> Function() onDate;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final classes = ref.watch(lessonFlowClassesProvider);
    final chapters = ref.watch(lessonFlowChaptersProvider);
    final own = classes.value == null ? null : runnableClasses(classes.value!, role: role, userId: userId);
    final failed = classes.hasError || chapters.hasError;
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          _PickTile(
            key: const ValueKey('flow:class'),
            icon: AppIcons.myClass,
            label: 'Анги',
            value: selectedClass?.name,
            placeholder: own != null && own.isEmpty ? 'Танд оноогдсон анги алга' : 'Сонгох',
            onTap: own == null || own.isEmpty ? null : () => unawaited(onClass(own)),
          ),
          const Divider(height: 1),
          _PickTile(
            key: const ValueKey('flow:date'),
            icon: AppIcons.calendar,
            label: 'Өдөр',
            value: DateMn.longWithWeekday(date),
            onTap: () => unawaited(onDate()),
          ),
          const Divider(height: 1),
          _PickTile(
            key: const ValueKey('flow:chapter'),
            icon: AppIcons.theory,
            label: 'Сэдэв',
            value: chapter?.title,
            onTap: chapters.value == null ? null : () => unawaited(onChapter(chapters.value!)),
          ),
          if (failed)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.sm, AppSpace.sm),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      'Анги эсвэл сэдэв нээгдсэнгүй',
                      style: context.text.bodyMedium?.copyWith(color: context.colors.error),
                    ),
                  ),
                  TextButton(
                    onPressed: () => ref
                      ..invalidate(lessonFlowClassesProvider)
                      ..invalidate(lessonFlowChaptersProvider),
                    child: const Text(AppStrings.retry),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _PickTile extends StatelessWidget {
  const _PickTile({
    super.key,
    required this.icon,
    required this.label,
    required this.value,
    required this.onTap,
    this.placeholder = 'Сонгох',
  });

  final IconData icon;
  final String label;
  final String? value;
  final String placeholder;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListTile(
      minTileHeight: 56,
      leading: Icon(icon, color: c.inkDim),
      title: Text(label, style: context.text.bodySmall),
      subtitle: Text(
        value ?? placeholder,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: context.text.bodyLarge?.copyWith(color: value == null ? c.inkDim : c.ink),
      ),
      trailing: onTap == null ? null : Icon(AppIcons.expand, color: c.inkDim),
      onTap: onTap,
    );
  }
}

/// Картын гарчиг + агуулга.
class _Card extends StatelessWidget {
  const _Card({required this.title, required this.children, this.trailing});

  final String title;
  final List<Widget> children;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.lg),
    child: AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Semantics(header: true, child: Text(title, style: context.text.titleMedium)),
              ),
              ?trailing,
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          ...children,
        ],
      ),
    ),
  );
}

class _Muted extends StatelessWidget {
  const _Muted(this.text);

  final String text;

  @override
  Widget build(BuildContext context) =>
      Text(text, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim));
}

void _snack(BuildContext context, String text) => ScaffoldMessenger.maybeOf(context)
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(text)));

/// Ангид хийсэн тест: бүртгэсэн тестүүд + «Тест бүртгэх».
class _TestCard extends ConsumerWidget {
  const _TestCard({required this.flowKey, required this.preview});

  final FlowKey flowKey;
  final FlowPreview preview;

  Future<void> _record(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(lessonFlowRepositoryProvider);
    final done = await showFormSheet<bool>(
      context,
      title: 'Ангид хийсэн тест',
      subtitle: preview.chapterTitle,
      submitLabel: 'Бүртгэх',
      fields: [
        FormSelectField<String>(
          name: 'test',
          label: 'Тест',
          required: true,
          options: [for (final t in preview.tests) SelectOption(t.id, t.title)],
        ),
      ],
      onSubmit: (v) async {
        await repo.recordTest(classId: flowKey.classId, testId: v.get<String>('test')!, date: flowKey.date);
        return true;
      },
    );
    if (done != true) return;
    ref.invalidate(lessonFlowPreviewProvider(flowKey));
    if (context.mounted) _snack(context, 'Тест бүртгэгдлээ, даалгавраа шалгаж хадгална уу');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final done = [for (final s in preview.sessions) preview.testTitle(s.testId) ?? s.manualTitle ?? 'Тест'];
    return _Card(
      title: 'Ангид хийсэн тест',
      children: [
        if (done.isEmpty)
          const _Muted('Энэ өдөр тест бүртгээгүй')
        else
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: [for (final t in done) MetaChip(label: t, icon: AppIcons.check, tone: ChipTone.success)],
          ),
        const SizedBox(height: AppSpace.md),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: OutlinedButton.icon(
            onPressed: preview.tests.isEmpty ? null : () => unawaited(_record(context, ref)),
            icon: const Icon(AppIcons.add, size: 18),
            label: Text(preview.tests.isEmpty ? 'Сэдэвт нийтлэгдсэн тест алга' : 'Тест бүртгэх'),
          ),
        ),
      ],
    );
  }
}

/// Гэрийн даалгавар: автоматаар бөглөсөн санал, багш тохируулж хадгална (өдрийн багц хамт).
class _HomeworkCard extends ConsumerWidget {
  const _HomeworkCard({required this.flowKey, required this.preview});

  final FlowKey flowKey;
  final FlowPreview preview;

  Future<void> _save(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(lessonFlowRepositoryProvider);
    final tests = [const SelectOption('', 'Сонгоогүй'), for (final t in preview.tests) SelectOption(t.id, t.title)];
    final day = parseDateKey(flowKey.date)!;
    final saved = await showFormSheet<FlowPacket>(
      context,
      title: preview.saved ? 'Даалгавар засах' : 'Өдрийн багц хадгалах',
      subtitle: preview.chapterTitle,
      fields: [
        FormTextField(name: 'title', label: 'Гарчиг', initial: preview.prefillTitle, required: true, maxLength: 200),
        FormTextField(
          name: 'description',
          label: 'Бодлого ба тайлбар',
          initial: preview.prefillDescription,
          maxLines: 6,
          maxLength: 10000,
        ),
        FormDateField(
          name: 'due',
          label: 'Дуусах өдөр, 20:00',
          initial: parseDateKey(preview.homeworkDue),
          first: day,
          last: day.addDays(60),
        ),
        FormSelectField<String>(
          name: 'test',
          label: 'Ангид хийсэн тест',
          initial: preview.linkedTestId ?? '',
          options: tests,
        ),
        FormSelectField<String>(
          name: 'makeup',
          label: 'Тасалсан сурагчийн нөхөх A хувилбар',
          initial: preview.packet?.makeupTestId ?? '',
          options: tests,
        ),
      ],
      onSubmit: (v) {
        final test = v.get<String>('test') ?? '';
        final makeup = v.get<String>('makeup') ?? '';
        return repo.saveDay(
          classId: flowKey.classId,
          date: flowKey.date,
          chapterId: preview.chapterId,
          testId: test.isEmpty ? null : test,
          makeupTestId: makeup.isEmpty ? null : makeup,
          title: v.text('title'),
          description: v.get<String>('description') ?? '',
          imageKeys: preview.homeworkImageKeys,
          dueDate: v.date('due')?.dateKey,
        );
      },
    );
    if (saved == null) return;
    ref.invalidate(lessonFlowPreviewProvider(flowKey));
    if (context.mounted) _snack(context, 'Хадгалагдлаа, сурагчид даалгаврын хэсгээс илгээнэ');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final p = preview;
    final hasHomework = p.packet?.homeworkAssignmentId != null;
    final due = parseDateKey(p.homeworkDue);
    return _Card(
      title: 'Гэрийн даалгавар',
      trailing: hasHomework ? const MetaChip(label: 'Хадгалсан', icon: AppIcons.check, tone: ChipTone.success) : null,
      children: [
        Text(p.prefillTitle, style: context.text.titleSmall),
        if (p.prefillDescription.trim().isNotEmpty) ...[
          const SizedBox(height: AppSpace.xs),
          Text(p.prefillDescription, maxLines: 6, overflow: TextOverflow.ellipsis, style: context.text.bodyMedium),
        ],
        const SizedBox(height: AppSpace.sm),
        Meta(
          items: [
            if (due != null) 'Дуусах ${DateMn.long(due)}, 20:00' else 'Дуусах өдөргүй',
            if (p.homeworkImageKeys.isNotEmpty) '${p.homeworkImageKeys.length} хавсралт',
            if (p.testTitle(p.packet?.makeupTestId) case final m?) 'Нөхөх: $m',
          ],
        ),
        if (!hasHomework) ...[
          const SizedBox(height: AppSpace.xs),
          const _Muted('Автоматаар бөглөсөн санал, шалгаж хадгална уу'),
        ],
        const SizedBox(height: AppSpace.md),
        Align(
          alignment: AlignmentDirectional.centerStart,
          child: FilledButton.icon(
            onPressed: () => unawaited(_save(context, ref)),
            icon: const Icon(AppIcons.save, size: 18),
            label: Text(hasHomework ? 'Даалгавар засах' : 'Өдрийн багц хадгалах'),
          ),
        ),
      ],
    );
  }
}

/// Зураг авах ээлж — өдрийн багц хадгалсны дараа.
class _TurnCard extends ConsumerStatefulWidget {
  const _TurnCard({required this.flowKey, required this.preview});

  final FlowKey flowKey;
  final FlowPreview preview;

  @override
  ConsumerState<_TurnCard> createState() => _TurnCardState();
}

class _TurnCardState extends ConsumerState<_TurnCard> {
  bool _busy = false;

  Future<void> _auto() async {
    final packet = widget.preview.packet;
    if (packet == null) return;
    setState(() => _busy = true);
    try {
      await ref.read(lessonFlowRepositoryProvider).assignTurn(packet.id);
      ref.invalidate(lessonFlowPreviewProvider(widget.flowKey));
      if (mounted) _snack(context, 'Зураг авах ээлж хадгалагдлаа');
    } catch (e) {
      if (mounted) _snack(context, e is ApiError ? e.message : 'Ирцээ тэмдэглээд дахин оролдоно уу');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _choose() async {
    final p = widget.preview;
    final packet = p.packet;
    if (packet == null) return;
    final repo = ref.read(lessonFlowRepositoryProvider);
    final saved = await showFormSheet<PhotoTurn>(
      context,
      title: 'Ээлжийг өөрөө сонгох',
      submitLabel: 'Батлах',
      fields: [
        FormSelectField<String>(
          name: 'pupil',
          label: 'Сурагч',
          required: true,
          options: [for (final s in p.photoCandidates) SelectOption(s.id, s.name)],
        ),
        const FormTextField(name: 'reason', label: 'Шалтгаан', required: true, maxLength: 500),
      ],
      onSubmit: (v) => repo.assignTurn(packet.id, studentId: v.get<String>('pupil'), reason: v.text('reason')),
    );
    if (saved == null) return;
    ref.invalidate(lessonFlowPreviewProvider(widget.flowKey));
    if (mounted) _snack(context, 'Зураг авах ээлж хадгалагдлаа');
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.preview;
    final turn = p.packet?.photoTurn;
    return _Card(
      title: 'Онолын зураг авах ээлж',
      children: [
        if (!p.saved)
          const _Muted('Өдрийн багцаа хадгалсны дараа ээлж батална')
        else ...[
          if (turn == null)
            const _Muted('Ээлж батлаагүй')
          else
            ItemRow(
              leading: Icon(AppIcons.camera, color: context.colors.brand),
              title: p.pupilName(turn.studentId),
              meta: [photoTurnReason(turn.reason)],
            ),
          const SizedBox(height: AppSpace.md),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              FilledButton.tonal(
                onPressed: _busy ? null : () => unawaited(_auto()),
                child: Text(turn == null ? 'Ээлж батлах' : 'Ээлж шинэчлэх'),
              ),
              OutlinedButton(
                onPressed: _busy || p.photoCandidates.isEmpty ? null : () => unawaited(_choose()),
                child: const Text('Өөрөө сонгох'),
              ),
            ],
          ),
          if (p.photoCandidates.isEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            const _Muted('Ирсэн, хоцорсон сурагчийн ирцийг эхлээд тэмдэглэнэ'),
          ],
        ],
      ],
    );
  }
}

/// Сэдвийн онол — зураг, PDF-ийг апп дотор нээнэ.
class _TheoryCard extends StatelessWidget {
  const _TheoryCard({required this.preview});

  final FlowPreview preview;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return _Card(
      title: 'Онол',
      children: [
        for (final t in preview.theories)
          InkWell(
            onTap: t.imageKeys.isEmpty
                ? null
                : () => unawaited(FileGalleryScreen.open(context, fileKeys: t.imageKeys, title: 'Онол')),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap),
              child: Row(
                children: [
                  Expanded(child: MathText(t.title)),
                  if (t.imageKeys.isNotEmpty) ...[
                    const SizedBox(width: AppSpace.sm),
                    Text('${t.imageKeys.length}', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
                    const SizedBox(width: AppSpace.xs),
                    Icon(AppIcons.images, size: 20, color: c.brand),
                  ],
                ],
              ),
            ),
          ),
      ],
    );
  }
}

/// Ирцээс гарах санал: дараагийн ээлж, нөхөх хичээлтэй сурагчид.
class _AttendanceCard extends StatelessWidget {
  const _AttendanceCard({required this.preview});

  final FlowPreview preview;

  @override
  Widget build(BuildContext context) {
    final p = preview;
    Widget names(List<FlowPupil> list) => Wrap(
      spacing: AppSpace.sm,
      runSpacing: AppSpace.xs,
      children: [for (final s in list) MetaChip(label: s.name)],
    );
    return _Card(
      title: 'Ирцийн санал',
      children: [
        Text('Ээлжийн санал', style: context.text.labelLarge),
        const SizedBox(height: AppSpace.xs),
        if (p.rotation.isEmpty) const _Muted('Ирцээ эхлээд тэмдэглэнэ үү') else names(p.rotation),
        const SizedBox(height: AppSpace.md),
        Text('Нөхөх хичээл шаардлагатай', style: context.text.labelLarge),
        const SizedBox(height: AppSpace.xs),
        if (p.makeupPupils.isEmpty) const _Muted('Тасалсан сурагч алга') else names(p.makeupPupils),
      ],
    );
  }
}
