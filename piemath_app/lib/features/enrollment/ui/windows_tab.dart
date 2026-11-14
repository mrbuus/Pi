import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/enrollment_providers.dart';
import '../data/enrollment_models.dart';
import '../data/enrollment_repository.dart';
import '../domain/window_draft.dart';
import 'enrollment_actions.dart';
import 'enrollment_widgets.dart';

/// «Элсэлтийн цонх» (вэбийн `EnrollmentClient`): хичээл бүрийг бие даан нээх/хаах, хамрах хэлбэр, зочдод харагдах
/// тэмдэглэл, «Бүгдийг нэг дор», ангид ороогүй сурагчид. Нүүр хуудсанд шууд нөлөөлнө — хадгалахаас өмнө урьдчилан харна.
class WindowsTab extends ConsumerStatefulWidget {
  const WindowsTab({super.key});

  @override
  ConsumerState<WindowsTab> createState() => _WindowsTabState();
}

class _WindowsTabState extends ConsumerState<WindowsTab> {
  List<EnrollmentWindow> _saved = const [];
  final _drafts = <EnrollmentSubject, WindowDraft>{};
  final _notes = <EnrollmentSubject, TextEditingController>{};
  final _saving = <EnrollmentSubject>{};
  final _errors = <EnrollmentSubject, String>{};
  bool _bulkBusy = false;
  String? _bulkError;
  EnrollmentStatus? _lastBulk;

  @override
  void initState() {
    super.initState();
    ref.listenManual(enrollmentWindowsProvider, (_, next) {
      final rows = next.value;
      if (rows != null) _absorb(orderedWindows(rows));
    }, fireImmediately: true);
  }

  @override
  void dispose() {
    for (final c in _notes.values) {
      c.dispose();
    }
    super.dispose();
  }

  /// Серверийн шинэ мөрийг авна; хадгалаагүй ноорогтой картыг дарж бичихгүй.
  void _absorb(List<EnrollmentWindow> rows) {
    final merged = mergeDrafts(_drafts, _saved, rows);
    void apply() {
      _saved = rows;
      _drafts
        ..clear()
        ..addAll(merged);
      for (final e in merged.entries) {
        final c = _notes.putIfAbsent(e.key, TextEditingController.new);
        if (c.text != e.value.note) c.text = e.value.note;
      }
    }

    if (mounted) {
      setState(apply);
    } else {
      apply();
    }
  }

  EnrollmentWindow? _savedOf(EnrollmentSubject s) => _saved.where((w) => w.subject == s).firstOrNull;

  void _change(EnrollmentSubject s, WindowDraft d) => setState(() => _drafts[s] = d);

  void _discard(EnrollmentSubject s) {
    final saved = _savedOf(s);
    if (saved == null) return;
    setState(() {
      _drafts[s] = WindowDraft.of(saved);
      _notes[s]?.text = saved.note ?? '';
      _errors.remove(s);
    });
  }

  Future<void> _save(EnrollmentSubject s) async {
    final saved = _savedOf(s);
    final draft = _drafts[s];
    if (saved == null || draft == null || !draft.isDirtyAgainst(saved)) return;
    if (draft.needsCloseConfirm(saved) &&
        !await confirmAction(
          context,
          title: '«${s.label}»-ийг хаах уу',
          message:
              'Энэ хичээлийн элсэлт «Дууссан» болно. Нүүр хуудсаар шинэ хүсэлт ирэхээ зогсоох тул сайтар шалгаад баталгаажуулна уу',
          confirmLabel: 'Тийм, хаах',
        )) {
      return;
    }
    final d = draft.diff(saved);
    setState(() {
      _saving.add(s);
      _errors.remove(s);
    });
    try {
      final updated = await ref
          .read(enrollmentRepositoryProvider)
          .updateWindow(s, status: d.status, availability: d.availability, note: d.note);
      if (!mounted) return;
      setState(() {
        _saved = [for (final w in _saved) w.subject == s ? updated : w];
        _drafts[s] = WindowDraft.of(updated);
        if (_notes[s]?.text != (updated.note ?? '')) _notes[s]?.text = updated.note ?? '';
      });
      enrollmentSnack(context, '«${s.label}» хадгалагдлаа');
    } catch (e) {
      if (mounted) setState(() => _errors[s] = enrollmentError(e, 'Хадгалж чадсангүй. Дахин оролдоно уу'));
    } finally {
      if (mounted) setState(() => _saving.remove(s));
    }
  }

  Future<void> _bulk(EnrollmentStatus status) async {
    if (_saved.isEmpty || _bulkBusy) return;
    if (status == EnrollmentStatus.closed &&
        !await confirmAction(
          context,
          title: 'Бүх хичээлийг хаах уу',
          message:
              '${_saved.map((w) => w.subject.label).join(', ')} хичээлийн элсэлт бүгд «Дууссан» болно. Ямар ч хичээлээр шинэ хүсэлт ирэхээ зогсооно',
          confirmLabel: 'Тийм, хаах',
        )) {
      return;
    }
    setState(() {
      _lastBulk = status;
      _bulkBusy = true;
      _bulkError = null;
    });
    try {
      final updated = await ref.read(enrollmentRepositoryProvider).setAllStatus(_saved, status);
      if (!mounted) return;
      setState(() {
        final ordered = orderedWindows(updated);
        for (final w in ordered) {
          // Бусад талбарын ноорог хэвээр — «бүгдийг нэг дор» зөвхөн төлвийг нэгтгэнэ.
          _drafts[w.subject] = (_drafts[w.subject] ?? WindowDraft.of(w)).copyWith(status: w.status);
        }
        _saved = ordered;
      });
      enrollmentSnack(context, 'Бүх хичээл «${status.label}» боллоо');
    } catch (e) {
      if (mounted) setState(() => _bulkError = enrollmentError(e, 'Бүгдийг солиж чадсангүй'));
      // Хагас амжилттай байж болох тул серверээс дахин уншина.
      ref.invalidate(enrollmentWindowsProvider);
    } finally {
      if (mounted) setState(() => _bulkBusy = false);
    }
  }

  Future<void> _refresh() async {
    ref.invalidate(unassignedStudentsProvider);
    await ref.refresh(enrollmentWindowsProvider.future).then((_) {}, onError: (_) {});
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(enrollmentWindowsProvider);
    final loaded = _saved.isNotEmpty || async.hasValue;
    return TabScroll(
      onRefresh: _refresh,
      slivers: [
        if (!loaded && async.isLoading)
          const SliverState(height: 420, child: LoadingState(padding: EdgeInsets.zero))
        else if (!loaded && async.hasError)
          SliverState(
            child: ErrorState(
              message: enrollmentError(async.error!, 'Элсэлтийн цонх нээгдсэнгүй'),
              onRetry: () => ref.invalidate(enrollmentWindowsProvider),
            ),
          )
        else ...[
          SliverToBoxAdapter(child: _bulkCard(context)),
          SliverList.builder(
            itemCount: _saved.length,
            itemBuilder: (_, i) {
              final w = _saved[i];
              final draft = _drafts[w.subject] ?? WindowDraft.of(w);
              return Padding(
                padding: const EdgeInsets.only(top: AppSpace.md),
                child: _SubjectCard(
                  key: ValueKey('subject:${w.subject.api}'),
                  saved: w,
                  draft: draft,
                  note: _notes.putIfAbsent(w.subject, () => TextEditingController(text: draft.note)),
                  saving: _saving.contains(w.subject),
                  error: _errors[w.subject],
                  onChange: (d) => _change(w.subject, d),
                  onSave: () => _save(w.subject),
                  onDiscard: () => _discard(w.subject),
                ),
              );
            },
          ),
          const _UnassignedSection(),
        ],
      ],
    );
  }

  Widget _bulkCard(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.md),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(child: Text('Бүгдийг нэг дор', style: context.text.titleSmall)),
                const InfoHint(
                  title: 'Бүгдийг нэг дор',
                  message:
                      'Бүх хичээлийн элсэлтийн төлвийг нэг товчоор адилхан болгоно. Хамрах хэлбэр, тэмдэглэл хэвээр үлдэнэ',
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                for (final s in EnrollmentStatus.values)
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
                    onPressed: _bulkBusy ? null : () => _bulk(s),
                    child: Text('Бүгдийг «${s.label}» болгох'),
                  ),
              ],
            ),
            if (_bulkBusy) ...[
              const SizedBox(height: AppSpace.sm),
              const LinearProgressIndicator(),
            ],
            if (_bulkError != null) ...[
              const SizedBox(height: AppSpace.sm),
              InlineError(_bulkError!, onRetry: _lastBulk == null ? null : () => _bulk(_lastBulk!)),
            ],
          ],
        ),
      ),
    );
  }
}

class _SubjectCard extends StatelessWidget {
  const _SubjectCard({
    super.key,
    required this.saved,
    required this.draft,
    required this.note,
    required this.saving,
    required this.error,
    required this.onChange,
    required this.onSave,
    required this.onDiscard,
  });

  final EnrollmentWindow saved;
  final WindowDraft draft;
  final TextEditingController note;
  final bool saving;
  final String? error;
  final ValueChanged<WindowDraft> onChange;
  final VoidCallback onSave;
  final VoidCallback onDiscard;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dirty = draft.isDirtyAgainst(saved);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(saved.subject.label, style: context.text.titleMedium)),
              Semantics(label: 'Одоо сайт дээр харагдаж буй төлөв', child: EnrollmentStatusChip(saved.status)),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          const FieldLabel('Элсэлтийн төлөв'),
          Wrap(
            spacing: AppSpace.sm,
            children: [
              for (final s in EnrollmentStatus.values)
                PickChip(
                  label: s.label,
                  selected: draft.status == s,
                  onSelected: saving ? null : () => onChange(draft.copyWith(status: s)),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          const FieldLabel('Хамрах хэлбэр'),
          Wrap(
            spacing: AppSpace.sm,
            children: [
              for (final a in SubjectAvailability.values)
                PickChip(
                  label: a.label,
                  selected: draft.availability == a,
                  onSelected: saving ? null : () => onChange(draft.copyWith(availability: a)),
                ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: note,
            enabled: !saving,
            maxLength: 500,
            minLines: 1,
            maxLines: 3,
            onChanged: (v) => onChange(draft.copyWith(note: v)),
            decoration: const InputDecoration(
              labelText: 'Зочдод харуулах тэмдэглэл',
              hintText: 'Жишээ: 12-р ангийн бүлэг дүүрсэн',
            ),
          ),
          _VisitorPreview(subject: saved.subject, draft: draft),
          const SizedBox(height: AppSpace.md),
          if (error != null) ...[InlineError(error!), const SizedBox(height: AppSpace.sm)],
          Row(
            children: [
              Expanded(
                child: dirty && error == null
                    ? Text('Хадгалаагүй өөрчлөлт бий', style: context.text.bodySmall?.copyWith(color: c.warning))
                    : const SizedBox.shrink(),
              ),
              if (dirty) ...[
                OutlinedButton(
                  style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
                  onPressed: saving ? null : onDiscard,
                  child: const Text('Цуцлах'),
                ),
                const SizedBox(width: AppSpace.sm),
              ],
              FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: !dirty || saving ? null : onSave,
                child: Text(saving ? FormMessages.saving : AppStrings.save),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Зочин нүүр хуудсанд юу харах (ноорог дээр үндэслэв, вэбийн `VisitorPreview`).
class _VisitorPreview extends StatelessWidget {
  const _VisitorPreview({required this.subject, required this.draft});

  final EnrollmentSubject subject;
  final WindowDraft draft;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final note = draft.note.trim();
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.surfaceSunken,
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(AppIcons.show, size: 16, color: c.inkDim),
                const SizedBox(width: AppSpace.xs),
                Expanded(
                  child: Text('Зочин юу харах вэ', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            Row(
              children: [
                Expanded(child: Text(subject.label, style: context.text.titleSmall)),
                EnrollmentStatusChip(draft.status),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            Text(visitorLine(draft.status, draft.availability), style: context.text.bodySmall),
            if (note.isNotEmpty) ...[
              const SizedBox(height: AppSpace.xs),
              Text('«$note»', style: context.text.bodySmall?.copyWith(fontStyle: FontStyle.italic, color: c.inkDim)),
            ],
          ],
        ),
      ),
    );
  }
}

/// Ангид ороогүй сурагчид (вэбийн `UnassignedStudents`): эхний 5, «Бүгдийг харах».
class _UnassignedSection extends ConsumerStatefulWidget {
  const _UnassignedSection();

  @override
  ConsumerState<_UnassignedSection> createState() => _UnassignedSectionState();
}

class _UnassignedSectionState extends ConsumerState<_UnassignedSection> {
  static const _batch = 5;
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(unassignedStudentsProvider);
    final now = ref.watch(enrollmentNowProvider)();
    final rows = async.value ?? const <WaitingStudent>[];
    final visible = _expanded ? rows : rows.take(_batch).toList();
    return SliverMainAxisGroup(
      slivers: [
        SliverToBoxAdapter(
          child: SectionHeader(
            title: 'Ангид ороогүй сурагчид',
            trailing: async.hasValue ? Text('${rows.length} сурагч', style: context.text.bodySmall) : null,
          ),
        ),
        if (async.isLoading && !async.hasValue)
          const SliverState(height: 200, child: LoadingState(cards: 2, padding: EdgeInsets.zero))
        else if (async.hasError && !async.hasValue)
          SliverToBoxAdapter(
            child: InlineError(
              enrollmentError(async.error!, 'Жагсаалт нээгдсэнгүй'),
              onRetry: () => ref.invalidate(unassignedStudentsProvider),
            ),
          )
        else if (rows.isEmpty)
          const SliverState(
            height: 200,
            child: EmptyState(icon: AppIcons.students, title: 'Ангид ороогүй сурагч алга'),
          )
        else ...[
          SliverList.builder(
            itemCount: visible.length,
            itemBuilder: (_, i) {
              final s = visible[i];
              final since = parseApiInstant(s.waitingSince);
              return Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: AppCard(
                  child: ItemRow(
                    title: s.name,
                    meta: [
                      spacedPhone(s.phone),
                      if (s.grade != null) '${s.grade}-р анги',
                      if (since != null) '${waitingDays(since, now)} өдөр хүлээж байна',
                    ],
                  ),
                ),
              );
            },
          ),
          if (!_expanded && rows.length > _batch)
            SliverToBoxAdapter(
              child: OutlinedButton.icon(
                style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(48)),
                onPressed: () => setState(() => _expanded = true),
                icon: const Icon(AppIcons.expand, size: 18),
                label: Text('Бүгдийг харах (${rows.length})'),
              ),
            ),
        ],
      ],
    );
  }
}
