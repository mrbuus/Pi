import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/files/files.dart';
import '../../../core/format/person_name.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_models.dart';
import '../data/teacher_repository.dart';
import 'teacher_widgets.dart';

/// Онлайн ангийн даалгаврууд (`/app/classes/:id/assignments`), шалгах хүлээгдэж буй тоотой.
class AssignmentsScreen extends ConsumerWidget {
  const AssignmentsScreen({super.key, required this.classId});

  final String classId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(assignmentsProvider(classId));
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(title: const Text('Онлайн даалгавар')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: errorText(e, 'Даалгаврын жагсаалт нээгдсэнгүй'),
          onRetry: () => ref.invalidate(assignmentsProvider(classId)),
        ),
        data: (list) {
          if (list.isEmpty) return const EmptyState(icon: AppIcons.homework, title: 'Онлайн гэрийн даалгавар алга');
          return RefreshIndicator(
            onRefresh: () => ref.refresh(assignmentsProvider(classId).future).then((_) {}, onError: (_) {}),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpace.gutter),
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
              itemBuilder: (context, i) {
                final a = list[i];
                final day = parseDateKey(a.lessonDate ?? a.dueDate);
                return AppCard(
                  onTap: () => context.push(
                    '/app/classes/${Uri.encodeComponent(classId)}/assignments/${Uri.encodeComponent(a.id)}',
                    extra: a.title,
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(a.title.isEmpty ? 'Даалгавар' : a.title, style: context.text.titleSmall),
                            if (day != null)
                              Text(
                                DateMn.longWithWeekday(day, shortWeekday: true),
                                style: context.text.bodySmall?.copyWith(color: c.inkDim),
                              ),
                          ],
                        ),
                      ),
                      if (a.pending > 0)
                        Semantics(
                          label: 'Шалгах ${a.pending}',
                          excludeSemantics: true,
                          child: Text('Шалгах ${a.pending}', style: context.text.labelLarge?.copyWith(color: c.brand)),
                        ),
                      const SizedBox(width: AppSpace.sm),
                      Icon(AppIcons.forward, color: c.inkDim),
                    ],
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

/// Нэг даалгаврын илгээлтүүд: зураг/баримт харах, зөвшөөрөх, буцаах, ангид шалгасан.
class SubmissionsScreen extends ConsumerWidget {
  const SubmissionsScreen({super.key, required this.assignmentId, this.title});

  final String assignmentId;
  final String? title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(submissionsProvider(assignmentId));
    return Scaffold(
      appBar: AppBar(title: Text(title ?? 'Даалгавар шалгах')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: errorText(e, 'Илгээлтүүд нээгдсэнгүй'),
          onRetry: () => ref.invalidate(submissionsProvider(assignmentId)),
        ),
        data: (list) {
          if (list.isEmpty) return const EmptyState(icon: AppIcons.students, title: 'Энэ ангид сурагч алга');
          final names = rosterNames([
            for (final s in list)
              (id: s.student.id, firstName: s.student.firstName, lastName: s.student.lastName, role: null),
          ]);
          // Шалгах хүлээгдэж буйг дээр.
          final sorted = [...list]..sort((a, b) => (a.state == 'SUBMITTED' ? 0 : 1) - (b.state == 'SUBMITTED' ? 0 : 1));
          return RefreshIndicator(
            onRefresh: () => ref.refresh(submissionsProvider(assignmentId).future).then((_) {}, onError: (_) {}),
            child: ListView.separated(
              padding: const EdgeInsets.all(AppSpace.gutter),
              itemCount: sorted.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
              itemBuilder: (context, i) => _SubmissionCard(
                assignmentId: assignmentId,
                submission: sorted[i],
                name: names[sorted[i].student.id] ?? sorted[i].student.firstName,
              ),
            ),
          );
        },
      ),
    );
  }
}

class _SubmissionCard extends ConsumerStatefulWidget {
  const _SubmissionCard({required this.assignmentId, required this.submission, required this.name});

  final String assignmentId;
  final Submission submission;
  final String name;

  @override
  ConsumerState<_SubmissionCard> createState() => _SubmissionCardState();
}

class _SubmissionCardState extends ConsumerState<_SubmissionCard> {
  bool _busy = false;
  String? _error;

  Future<void> _review(ReviewAction action) async {
    String? note;
    if (action == ReviewAction.giveBack) {
      note = await _askNote();
      if (note == null) return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref
          .read(teacherRepositoryProvider)
          .review(widget.assignmentId, studentId: widget.submission.student.id, action: action, note: note);
      if (!mounted) return;
      ref.invalidate(submissionsProvider(widget.assignmentId));
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Хадгалагдсангүй'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<String?> _askNote() async {
    final field = TextEditingController();
    final res = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Буцаах шалтгаан'),
        content: TextField(
          controller: field,
          autofocus: true,
          maxLength: 500,
          minLines: 2,
          maxLines: 4,
          decoration: const InputDecoration(hintText: 'Юуг засах вэ'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text(AppStrings.cancel)),
          FilledButton(onPressed: () => Navigator.pop(ctx, field.text), child: const Text('Буцаах')),
        ],
      ),
    );
    field.dispose();
    return res;
  }

  @override
  Widget build(BuildContext context) {
    final s = widget.submission;
    final c = context.colors;
    final submitted = s.state == 'SUBMITTED';
    final at = parseApiInstant(s.submittedAt);
    final noteText = s.studentNote ?? s.note;
    return AppCard(
      accent: submitted ? c.brand : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(widget.name, style: context.text.titleSmall)),
              Text(
                submissionStateLabel(s.state),
                style: context.text.labelMedium?.copyWith(color: submitted ? c.brand : c.inkDim),
              ),
            ],
          ),
          if (at != null)
            Text('Илгээсэн: ${DateMn.relative(at)}', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          if (noteText != null && noteText.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.xs),
            Text(noteText.trim(), style: context.text.bodyMedium),
          ],
          if (s.reviewNote != null && s.reviewNote!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.xs),
            Text('Багшийн тайлбар: ${s.reviewNote!.trim()}', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          ],
          if (s.imageKeys.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
              onPressed: () => FileGalleryScreen.open(context, fileKeys: s.imageKeys, title: widget.name),
              icon: const Icon(AppIcons.gallery),
              label: Text('Зураг харах (${s.imageKeys.length})'),
            ),
          ],
          if (_error != null) ...[
            const SizedBox(height: AppSpace.sm),
            Text(_error!, style: context.text.bodySmall?.copyWith(color: c.error)),
          ],
          if (s.state != 'DONE_IN_CLASS') ...[
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                if (submitted) ...[
                  FilledButton.icon(
                    style: FilledButton.styleFrom(minimumSize: const Size(0, teacherTap)),
                    onPressed: _busy ? null : () => _review(ReviewAction.approve),
                    icon: const Icon(AppIcons.check, size: 18),
                    label: const Text('Зөвшөөрөх'),
                  ),
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(minimumSize: const Size(0, teacherTap)),
                    onPressed: _busy ? null : () => _review(ReviewAction.giveBack),
                    icon: const Icon(AppIcons.undo, size: 18),
                    label: const Text('Буцаах'),
                  ),
                ],
                TextButton.icon(
                  style: TextButton.styleFrom(minimumSize: const Size(0, teacherTap)),
                  onPressed: _busy ? null : () => _review(ReviewAction.markInClass),
                  icon: const Icon(AppIcons.myClass, size: 18),
                  label: const Text('Ангид шалгасан'),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
