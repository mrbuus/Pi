import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../application/board_controller.dart';
import '../domain/board_logic.dart';
import 'teacher_widgets.dart';

/// «⋯» — нэг сурагчийн хоцролтын хугацаа, шалтгаан, тэмдэглэл. Чип шууд хадгалагдана, бичвэр
/// бичиж зогссоны дараа (sheet хаахад шууд) хадгалагдана.
class BoardNoteSheet extends ConsumerStatefulWidget {
  const BoardNoteSheet({super.key, required this.args, required this.studentId, required this.name});

  final BoardArgs args;
  final String studentId;
  final String name;

  static Future<void> open(
    BuildContext context, {
    required BoardArgs args,
    required String studentId,
    required String name,
  }) async {
    final container = ProviderScope.containerOf(context, listen: false);
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => BoardNoteSheet(args: args, studentId: studentId, name: name),
    );
    // Хаасан даруйд бичиж байсан тэмдэглэлийг хүлээлгүй илгээнэ.
    if (container.exists(boardControllerProvider(args))) {
      container.read(boardControllerProvider(args).notifier).flushNotes();
    }
  }

  @override
  ConsumerState<BoardNoteSheet> createState() => _BoardNoteSheetState();
}

class _BoardNoteSheetState extends ConsumerState<BoardNoteSheet> {
  late final TextEditingController _att;
  late final TextEditingController _hw;

  @override
  void initState() {
    super.initState();
    final rec = ref.read(boardControllerProvider(widget.args)).recs[widget.studentId] ?? DayRec.empty;
    _att = TextEditingController(text: rec.attNote);
    _hw = TextEditingController(text: rec.hwNote);
  }

  @override
  void dispose() {
    _att.dispose();
    _hw.dispose();
    super.dispose();
  }

  BoardController get _ctl => ref.read(boardControllerProvider(widget.args).notifier);

  void _pick(TextEditingController field, Cell cell, String text) {
    final next = field.text.trim() == text ? '' : text;
    field.text = next;
    _ctl.setNote(widget.studentId, cell, next, typed: false);
  }

  @override
  Widget build(BuildContext context) {
    final s = ref.watch(boardControllerProvider(widget.args));
    final rec = s.recs[widget.studentId] ?? DayRec.empty;
    final reasons = reasonsForAttendance(rec.att);
    final hwReasons = rec.hw == HomeworkStatus.partial || rec.hw == HomeworkStatus.notDone;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Expanded(child: Text(widget.name, style: context.text.titleMedium)),
                  Flexible(
                    child: SaveStatus(pending: s.pending, savedAt: s.savedAt, error: s.saveError),
                  ),
                ],
              ),
              const SizedBox(height: AppSpace.md),
              Text('Ирц', style: context.text.labelLarge),
              const SizedBox(height: AppSpace.xs),
              AttendanceMarkView(status: rec.att, lateRange: rec.lateRange),
              if (rec.att == AttendanceStatus.late) ...[
                const SizedBox(height: AppSpace.md),
                Text('Хэр хоцорсон бэ', style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
                const SizedBox(height: AppSpace.xs),
                Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.sm,
                  children: [
                    for (final r in LateRange.values)
                      ChoiceChip(
                        label: Text(lateRangeLabel(r)),
                        selected: rec.lateRange == r,
                        materialTapTargetSize: MaterialTapTargetSize.padded,
                        onSelected: (on) => _ctl.setLateRange(widget.studentId, on ? r : null),
                      ),
                  ],
                ),
              ],
              if (reasons.isNotEmpty) ...[
                const SizedBox(height: AppSpace.md),
                Text(
                  rec.att == AttendanceStatus.excused ? 'Чөлөөний шалтгаан' : 'Тасалсан шалтгаан',
                  style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
                ),
                const SizedBox(height: AppSpace.xs),
                Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.sm,
                  children: [
                    for (final r in reasons)
                      ChoiceChip(
                        label: Text(r),
                        selected: rec.attNote.trim() == r,
                        materialTapTargetSize: MaterialTapTargetSize.padded,
                        onSelected: (_) => _pick(_att, Cell.attNote, r),
                      ),
                  ],
                ),
              ],
              const SizedBox(height: AppSpace.md),
              TextField(
                controller: _att,
                enabled: rec.att != null,
                maxLength: noteMax,
                minLines: 1,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Ирцийн тэмдэглэл',
                  helperText: rec.att == null ? 'Ирцийг тэмдэглэсний дараа бичнэ' : null,
                ),
                onChanged: (t) => _ctl.setNote(widget.studentId, Cell.attNote, t, typed: true),
              ),
              if (s.homework) ...[
                const SizedBox(height: AppSpace.lg),
                Text('Даалгавар', style: context.text.labelLarge),
                const SizedBox(height: AppSpace.xs),
                HomeworkMarkView(status: rec.hw),
                if (hwReasons) ...[
                  const SizedBox(height: AppSpace.md),
                  Wrap(
                    spacing: AppSpace.sm,
                    runSpacing: AppSpace.sm,
                    children: [
                      for (final r in homeworkReasons)
                        ChoiceChip(
                          label: Text(r),
                          selected: rec.hwNote.trim() == r,
                          materialTapTargetSize: MaterialTapTargetSize.padded,
                          onSelected: (_) => _pick(_hw, Cell.hwNote, r),
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
                  onChanged: (t) => _ctl.setNote(widget.studentId, Cell.hwNote, t, typed: true),
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
      ),
    );
  }
}
