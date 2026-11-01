import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/homework_models.dart';
import '../data/homework_repository.dart';
import 'composer/notebook_composer_screen.dart';
import 'homework_badges.dart';
import 'homework_icons.dart';
import 'homework_providers.dart';

/// Онлайн ангийн загвар (`/assignments/my`): багшийн даалгавар → зураг + тэмдэглэл илгээх,
/// Батлах/Буцаах хүлээх (вэбийн `components/homework/HomeworkList`, `HomeworkCard`).
class OnlineHomeworkView extends ConsumerWidget {
  const OnlineHomeworkView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final list = ref.watch(assignmentsProvider);
    return list.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: e is ApiError ? e.message : AppStrings.genericError,
        onRetry: () => ref.invalidate(assignmentsProvider),
      ),
      data: (items) {
        if (items.isEmpty) {
          return const EmptyState(
            icon: AppIcons.homework,
            title: 'Даалгавар алга',
            message: 'Багш даалгавар өгөхөөр энд харагдана',
          );
        }
        return RefreshIndicator(
          onRefresh: () async => ref.invalidate(assignmentsProvider),
          child: ListView.separated(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xxl),
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
            itemBuilder: (_, i) => AssignmentCard(assignment: items[i]),
          ),
        );
      },
    );
  }
}

class AssignmentCard extends ConsumerWidget {
  const AssignmentCard({super.key, required this.assignment});

  final Assignment assignment;

  Future<void> _submit(BuildContext context, WidgetRef ref) async {
    final a = assignment;
    final resend = a.submission != null;
    final ok = await NotebookComposerScreen.open(
      context,
      title: resend ? 'Дахин илгээх' : 'Даалгавар илгээх',
      subtitle: a.title,
      maxPages: PhotoDocumentLimits.homeworkMaxPages,
      noteLabel: 'Багшид тэмдэглэл (заавал биш)',
      initialNote: a.submission?.studentNote ?? '',
      onSubmit: (pages, note, progress, cancel) async {
        final (file, _) = await uploadPhotoSet(
          ref,
          pages,
          purpose: UploadPurpose.homework,
          maxPages: PhotoDocumentLimits.homeworkMaxPages,
          fileName: uploadFileName('daalgavar', a.lessonDate ?? UbDateTime.now().dateKey),
          onProgress: progress,
          cancel: cancel,
        );
        progress(PhotoUploadPhase.saving, 1);
        await ref.read(homeworkRepositoryProvider).submitAssignment(a.id, imageKeys: [file.key], note: note);
      },
    );
    if (ok) {
      ref.invalidate(assignmentsProvider);
      if (context.mounted) {
        ScaffoldMessenger.maybeOf(context)?.showSnackBar(const SnackBar(content: Text('Даалгавар илгээгдлээ')));
      }
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final a = assignment;
    final sub = a.submission;
    final images = ref.watch(fileImageProvider);
    final thumbPx = (64 * MediaQuery.devicePixelRatioOf(context)).round();
    final review = sub?.reviewNote?.trim();
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Meta(items: [a.lessonLabel, a.classroomName]),
          const SizedBox(height: AppSpace.xs),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: Text(a.title, style: context.text.titleMedium)),
              const SizedBox(width: AppSpace.sm),
              AssignmentStatusPill(status: a.status),
            ],
          ),
          if (a.description != null && a.description!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            MathText(a.description!, style: context.text.bodyMedium),
          ],
          if (a.imageKeys.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            SizedBox(
              height: 64,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: a.imageKeys.length,
                separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
                itemBuilder: (context, i) {
                  final key = a.imageKeys[i];
                  return Semantics(
                    button: true,
                    label: 'Багшийн хавсаргасан ${i + 1}-р зураг',
                    child: InkWell(
                      onTap: () => FileGalleryScreen.open(context, fileKeys: a.imageKeys, title: a.title),
                      borderRadius: BorderRadius.circular(AppRadius.sm),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        child: SizedBox.square(
                          dimension: 64,
                          child: isDocumentKey(key)
                              ? ColoredBox(color: c.surfaceSunken, child: Icon(AppIcons.document, color: c.inkDim))
                              : Image(
                                  image: ResizeImage(images.image(key), width: thumbPx, allowUpscaling: false),
                                  fit: BoxFit.cover,
                                  errorBuilder: (_, _, _) => ColoredBox(
                                    color: c.surfaceSunken,
                                    child: Icon(AppIcons.gallery, color: c.inkDim),
                                  ),
                                ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
          if (a.dueDate != null) ...[
            const SizedBox(height: AppSpace.sm),
            Row(
              children: [
                Icon(HomeworkIcons.deadline, size: 16, color: c.inkDim),
                const SizedBox(width: AppSpace.xs),
                Text('${DateMn.long(UbDateTime.fromInstant(a.dueDate!))} хүртэл', style: context.text.bodySmall),
              ],
            ),
          ],
          if (review != null && review.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpace.md),
              decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.md)),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(HomeworkIcons.comment, size: 16, color: c.inkDim, semanticLabel: 'Багшийн тайлбар'),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(child: Text(review, style: context.text.bodyMedium)),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpace.md),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: [
              if (sub != null && sub.imageKeys.isNotEmpty)
                OutlinedButton.icon(
                  onPressed: () => FileGalleryScreen.open(
                    context,
                    fileKeys: sub.imageKeys,
                    title: 'Миний илгээсэн',
                    subtitle: a.title,
                  ),
                  icon: const Icon(AppIcons.gallery, size: 18),
                  label: const Text('Миний илгээсэн'),
                ),
              if (a.canSubmit && a.status != AssignmentStatus.doneOnline && a.status != AssignmentStatus.doneInClass)
                FilledButton.icon(
                  onPressed: () => _submit(context, ref),
                  icon: const Icon(AppIcons.camera, size: 18),
                  label: Text(sub == null ? 'Илгээх' : 'Дахин илгээх'),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
