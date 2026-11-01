import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_extras.dart';
import '../data/teacher_models.dart';
import '../data/teacher_repository.dart';
import '../domain/board_logic.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

const int lessonNoteMax = 500;
const int dismissalNoteMax = 1000;

String _msg(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;

/// Өнөөдрийн хичээл бүрийн тэмдэглэл (`PUT /lesson-records/:scheduleId/note`). Хоосон хадгалбал цэвэрлэгдэнэ
/// (сервер зөөлөн устгана). Хоёр багш зэрэг бичвэл сүүлийнх нь үлдэнэ — «Хэн, хэзээ» харагдана.
class LessonNotesCard extends ConsumerWidget {
  const LessonNotesCard({super.key, required this.date, required this.lessons});

  final String date;
  final List<BoardLesson> lessons;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final scheduled = [
      for (final l in lessons)
        if (l.scheduleId.isNotEmpty) l,
    ];
    if (scheduled.isEmpty) return const SizedBox.shrink();
    final async = ref.watch(lessonNotesProvider(date));
    final c = context.colors;
    return async.when(
      skipLoadingOnRefresh: true,
      loading: () => const AppCard(child: SizedBox(height: 48, child: Center(child: CircularProgressIndicator()))),
      error: (e, _) => AppCard(
        child: Row(
          children: [
            Icon(AppIcons.error, size: 18, color: c.error),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: Text(errorText(e, 'Хичээлийн тэмдэглэл нээгдсэнгүй'), style: context.text.bodySmall)),
            TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
              onPressed: () => ref.invalidate(lessonNotesProvider(date)),
              child: const Text(AppStrings.retry),
            ),
          ],
        ),
      ),
      data: (notes) => Column(
        children: [
          for (final (i, l) in scheduled.indexed) ...[
            if (i > 0) const SizedBox(height: AppSpace.sm),
            _NoteTile(
              date: date,
              lesson: l,
              note: notes[l.scheduleId],
              showTime: scheduled.length > 1,
            ),
          ],
        ],
      ),
    );
  }
}

class _NoteTile extends ConsumerWidget {
  const _NoteTile({required this.date, required this.lesson, required this.note, required this.showTime});

  final String date;
  final BoardLesson lesson;
  final LessonNote? note;
  final bool showTime;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final has = note != null && note!.body.trim().isNotEmpty;
    final at = parseApiInstant(note?.updatedAt);
    final title = showTime
        ? 'Хичээлийн тэмдэглэл, ${hm(lesson.startMinute)}–${hm(lesson.endMinute)}'
        : 'Хичээлийн тэмдэглэл';
    return AppCard(
      onTap: () => LessonNoteSheet.open(context, date: date, scheduleId: lesson.scheduleId, note: note),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(TeacherIcons.note, color: c.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: context.text.titleSmall),
                const SizedBox(height: AppSpace.xs),
                Text(
                  has ? note!.body : 'Өнөөдрийн хичээлийн тэмдэглэл бичих',
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                  style: context.text.bodyMedium?.copyWith(color: has ? null : c.inkDim),
                ),
                if (has)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpace.xs),
                    child: Meta(
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                      items: [note!.updatedByName, if (at != null) DateMn.relative(at)],
                    ),
                  ),
              ],
            ),
          ),
          Icon(TeacherIcons.edit, size: 18, color: c.inkDim),
        ],
      ),
    );
  }
}

/// Хичээлийн тэмдэглэл бичих/засах.
class LessonNoteSheet extends ConsumerStatefulWidget {
  const LessonNoteSheet({super.key, required this.date, required this.scheduleId, this.note});

  final String date;
  final String scheduleId;
  final LessonNote? note;

  static Future<void> open(
    BuildContext context, {
    required String date,
    required String scheduleId,
    LessonNote? note,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => LessonNoteSheet(date: date, scheduleId: scheduleId, note: note),
  );

  @override
  ConsumerState<LessonNoteSheet> createState() => _LessonNoteSheetState();
}

class _LessonNoteSheetState extends ConsumerState<LessonNoteSheet> {
  late final TextEditingController _text = TextEditingController(text: widget.note?.body ?? '');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _save(String body) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(teacherRepositoryProvider).saveLessonNote(widget.scheduleId, widget.date, body);
      ref.invalidate(lessonNotesProvider(widget.date));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = _msg(e, 'Тэмдэглэл хадгалагдсангүй');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasExisting = widget.note != null && widget.note!.body.trim().isNotEmpty;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Хичээлийн тэмдэглэл', style: context.text.titleMedium),
              const SizedBox(height: AppSpace.md),
              TextField(
                controller: _text,
                autofocus: true,
                minLines: 3,
                maxLines: 6,
                maxLength: lessonNoteMax,
                decoration: const InputDecoration(labelText: 'Өнөөдөр юу хийсэн, дараагийн хичээлд юу хэрэгтэй'),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpace.sm),
                Text(_error!, style: context.text.bodySmall?.copyWith(color: context.colors.error)),
              ],
              const SizedBox(height: AppSpace.md),
              Row(
                children: [
                  if (hasExisting)
                    TextButton(
                      style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                      onPressed: _busy ? null : () => _save(''),
                      child: const Text('Цэвэрлэх'),
                    ),
                  const Spacer(),
                  FilledButton(
                    style: FilledButton.styleFrom(minimumSize: const Size(140, teacherTap)),
                    onPressed: _busy ? null : () => _save(_text.text),
                    child: const Text(AppStrings.save),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Ангийн тарах ойролцоо цаг (`/learning-lab/classrooms/:id/dismissal`). Энэ ангид эрхгүй (403/404) бол
/// карт огт харагдахгүй — эрх сервер дээр.
class DismissalCard extends ConsumerWidget {
  const DismissalCard({super.key, required this.classId, required this.date});

  final String classId;
  final String date;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final args = (classId: classId, date: date);
    final async = ref.watch(dismissalProvider(args));
    final c = context.colors;
    return async.when(
      skipLoadingOnRefresh: true,
      loading: () => const SizedBox.shrink(),
      error: (e, _) {
        final hidden =
            e is ApiError &&
            (e.kind == ApiErrorKind.forbidden ||
                e.kind == ApiErrorKind.notFound ||
                e.kind == ApiErrorKind.unauthorized);
        if (hidden) return const SizedBox.shrink();
        return AppCard(
          child: Row(
            children: [
              Icon(AppIcons.error, size: 18, color: c.error),
              const SizedBox(width: AppSpace.sm),
              Expanded(child: Text(errorText(e, 'Тарах цаг нээгдсэнгүй'), style: context.text.bodySmall)),
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                onPressed: () => ref.invalidate(dismissalProvider(args)),
                child: const Text(AppStrings.retry),
              ),
            ],
          ),
        );
      },
      data: (d) => AppCard(
        onTap: () => DismissalSheet.open(context, classId: classId, date: date, current: d),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(TeacherIcons.clock, color: c.brand),
            const SizedBox(width: AppSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Тарах цаг', style: context.text.titleSmall),
                  const SizedBox(height: AppSpace.xs),
                  if (d == null)
                    Text('Тэмдэглээгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
                  else ...[
                    Meta(
                      items: ['Ойролцоо ${d.approximate}', if (d.lastLeft != null) 'Сүүлийн сурагч ${d.lastLeft}'],
                    ),
                    if (d.note != null && d.note!.trim().isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpace.xs),
                        child: Text(
                          d.note!,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.bodySmall?.copyWith(color: c.inkDim),
                        ),
                      ),
                  ],
                ],
              ),
            ),
            Icon(TeacherIcons.edit, size: 18, color: c.inkDim),
          ],
        ),
      ),
    );
  }
}

/// Тарах цаг тэмдэглэх. Цаг UB-ээр, «HH:mm».
class DismissalSheet extends ConsumerStatefulWidget {
  const DismissalSheet({super.key, required this.classId, required this.date, this.current});

  final String classId;
  final String date;
  final DismissalInfo? current;

  static Future<void> open(
    BuildContext context, {
    required String classId,
    required String date,
    DismissalInfo? current,
  }) => showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => DismissalSheet(classId: classId, date: date, current: current),
  );

  @override
  ConsumerState<DismissalSheet> createState() => _DismissalSheetState();
}

class _DismissalSheetState extends ConsumerState<DismissalSheet> {
  late final TextEditingController _note = TextEditingController(text: widget.current?.note ?? '');
  late String? _approx = widget.current?.approximate;
  late String? _last = widget.current?.lastLeft;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<String?> _pick(String? initial) async {
    final parts = (initial ?? '17:00').split(':');
    final t = await showTimePicker(
      context: context,
      initialTime: TimeOfDay(hour: int.tryParse(parts[0]) ?? 17, minute: int.tryParse(parts[1]) ?? 0),
      builder: (ctx, child) =>
          MediaQuery(data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true), child: child!),
    );
    if (t == null) return null;
    return '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  }

  Future<void> _save() async {
    if (_busy) return;
    final approx = _approx;
    if (approx == null) {
      setState(() => _error = 'Тарах ойролцоо цагаа сонгоно уу');
      return;
    }
    if (_last != null && _last!.compareTo(approx) < 0) {
      setState(() => _error = 'Сүүлийн сурагчийн цаг ойролцоо тарах цагаас өмнө байна. Цагуудаа шалгана уу');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(teacherRepositoryProvider)
          .saveDismissal(widget.classId, widget.date, approximate: approx, lastLeft: _last, note: _note.text);
      ref.invalidate(dismissalProvider((classId: widget.classId, date: widget.date)));
      if (mounted) Navigator.of(context).pop();
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _error = _msg(e, 'Хадгалагдсангүй. Цагуудаа шалгаад дахин оролдоно уу');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Тарах цаг', style: context.text.titleMedium),
              const SizedBox(height: AppSpace.md),
              _TimeRow(
                label: 'Тарах ойролцоо цаг',
                value: _approx,
                onTap: () async {
                  final v = await _pick(_approx);
                  if (v != null) setState(() => _approx = v);
                },
              ),
              const SizedBox(height: AppSpace.sm),
              _TimeRow(
                label: 'Сүүлийн сурагч явсан цаг',
                value: _last,
                onTap: () async {
                  final v = await _pick(_last ?? _approx);
                  if (v != null) setState(() => _last = v);
                },
                onClear: _last == null ? null : () => setState(() => _last = null),
              ),
              const SizedBox(height: AppSpace.md),
              TextField(
                controller: _note,
                minLines: 2,
                maxLines: 4,
                maxLength: dismissalNoteMax,
                decoration: const InputDecoration(labelText: 'Сурагч, эцэг эхэд харагдах тайлбар'),
              ),
              if (_error != null) ...[
                const SizedBox(height: AppSpace.sm),
                Text(_error!, style: context.text.bodySmall?.copyWith(color: c.error)),
              ],
              const SizedBox(height: AppSpace.md),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size(140, teacherTap)),
                  onPressed: _busy ? null : _save,
                  child: const Text(AppStrings.save),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _TimeRow extends StatelessWidget {
  const _TimeRow({required this.label, required this.value, required this.onTap, this.onClear});

  final String label;
  final String? value;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        Expanded(
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: Container(
              constraints: const BoxConstraints(minHeight: teacherTap),
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
              decoration: BoxDecoration(
                border: Border.all(color: c.line),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Row(
                children: [
                  Expanded(child: Text(label, style: context.text.bodyMedium)),
                  Text(
                    value ?? 'Сонгох',
                    style: context.text.titleSmall?.copyWith(color: value == null ? c.inkDim : null),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (onClear != null)
          IconButton(
            tooltip: 'Цаг арилгах',
            constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
            icon: const Icon(TeacherIcons.clear),
            onPressed: onClear,
          ),
      ],
    );
  }
}
