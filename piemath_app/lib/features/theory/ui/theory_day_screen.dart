import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/ui/ui.dart';
import '../../homework/domain/homework_logic.dart' show dayLabel;
import '../data/theory_models.dart';
import '../data/theory_repository.dart';

/// Нэг хичээлийн өдрийн онолын зураг: ангийнхны илгээсэн багцууд, өөрийн зургийг илгээх/солих/устгах
/// (вэбийн `TheoryDayPanel`). Хадгалах хугацаагүй (`purpose: theory`).
class TheoryDayScreen extends ConsumerWidget {
  const TheoryDayScreen({super.key, required this.classroomId, required this.date});

  final String classroomId;
  final String date;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final day = ref.watch(theoryDayProvider((classroomId, date)));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: Text(dayLabel(date))),
      body: day.when(
        skipLoadingOnRefresh: true,
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => ErrorState(
          message: e is ApiError ? e.message : 'Онолын зургийг нээж чадсангүй',
          onRetry: e is ApiError && e.kind == ApiErrorKind.forbidden
              ? null
              : () => ref.invalidate(theoryDayProvider((classroomId, date))),
        ),
        data: (d) => _DayBody(day: d),
      ),
    );
  }
}

class _DayBody extends ConsumerWidget {
  const _DayBody({required this.day});

  final TheoryDay day;

  String get _subtitle => [dayLabel(day.date), day.classroomName].join(', ');

  Future<void> _upload(BuildContext context, WidgetRef ref) async {
    final ok = await PhotoComposerScreen.open(
      context,
      title: 'Онолын зураг илгээх',
      subtitle: '$_subtitle, ${PhotoDocumentLimits.theoryMaxPages} хүртэл хуудас',
      maxPages: PhotoDocumentLimits.theoryMaxPages,
      onSubmit: (pages, _, progress, cancel) async {
        final (file, _) = await uploadPhotoSet(
          ref,
          pages,
          purpose: UploadPurpose.theory,
          maxPages: PhotoDocumentLimits.theoryMaxPages,
          fileName: uploadFileName('onol', day.date),
          onProgress: progress,
          cancel: cancel,
        );
        progress(PhotoUploadPhase.saving, 1);
        await ref.read(theoryRepositoryProvider).savePhotos(day.classroomId, day.date, [file.key]);
      },
    );
    if (ok) ref.invalidate(theoryDayProvider((day.classroomId, day.date)));
  }

  Future<void> _delete(BuildContext context, WidgetRef ref) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Зургаа устгах уу?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Устгах')),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await ref.read(theoryRepositoryProvider).savePhotos(day.classroomId, day.date, const []);
      ref.invalidate(theoryDayProvider((day.classroomId, day.date)));
    } on ApiError catch (e) {
      if (context.mounted) ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mine = day.mine;
    return RefreshIndicator(
      onRefresh: () async => ref.invalidate(theoryDayProvider((day.classroomId, day.date))),
      child: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          Text(day.classroomName, style: context.text.bodySmall),
          if (day.topic != null) ...[
            const SizedBox(height: AppSpace.xs),
            Text(day.topic!, style: context.text.titleMedium),
          ],
          if (day.tests.isNotEmpty) ...[
            const SizedBox(height: AppSpace.xs),
            Meta(items: day.tests),
          ],
          if (day.canUpload) ...[
            const SizedBox(height: AppSpace.lg),
            if (day.assignedToMe)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: Text('Багш таныг энэ өдрийн онолын зургийг авахаар томилсон', style: context.text.bodyMedium),
              ),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.xs,
              children: [
                FilledButton.icon(
                  onPressed: () => _upload(context, ref),
                  icon: const Icon(AppIcons.camera, size: 18),
                  label: Text(mine == null ? 'Онолын зураг илгээх' : 'Зургаа солих'),
                ),
                if (mine != null)
                  TextButton.icon(
                    onPressed: () => _delete(context, ref),
                    style: TextButton.styleFrom(foregroundColor: context.colors.error),
                    icon: const Icon(FileIcons.remove, size: 18),
                    label: const Text('Устгах'),
                  ),
              ],
            ),
          ],
          const SizedBox(height: AppSpace.lg),
          if (day.photos.isEmpty)
            EmptyState(
              icon: AppIcons.theoryPhoto,
              title: 'Онолын зураг алга',
              message: day.assignedName != null ? 'Томилогдсон: ${day.assignedName}' : 'Ангийнхан илгээмэгц энд харагдана',
            )
          else
            for (final set in day.photos) ...[
              _PhotoSetCard(set: set, subtitle: _subtitle),
              const SizedBox(height: AppSpace.md),
            ],
        ],
      ),
    );
  }
}

class _PhotoSetCard extends ConsumerWidget {
  const _PhotoSetCard({required this.set, required this.subtitle});

  final TheoryPhotoSet set;
  final String subtitle;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final images = ref.watch(fileImageProvider);
    final title = set.isMine ? 'Таны зураг' : set.uploaderName;
    final px = (96 * MediaQuery.devicePixelRatioOf(context)).round();
    void open() => FileGalleryScreen.open(context, fileKeys: set.imageKeys, title: title, subtitle: subtitle);
    return AppCard(
      onTap: open,
      semanticLabel: '$title, ${set.pages} хуудас',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(title, style: context.text.titleSmall)),
              if (set.isAssigned) Text('Томилогдсон', style: context.text.labelSmall?.copyWith(color: c.brand)),
            ],
          ),
          Meta(items: ['${set.pages} хуудас', if (set.createdAt != null) DateMn.relative(set.createdAt!)]),
          const SizedBox(height: AppSpace.sm),
          SizedBox(
            height: 96,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: set.imageKeys.length,
              separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
              itemBuilder: (_, i) {
                final key = set.imageKeys[i];
                return ClipRRect(
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  child: SizedBox(
                    width: 80,
                    height: 96,
                    child: isDocumentKey(key)
                        ? ColoredBox(
                            color: c.surfaceSunken,
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(FileIcons.pages, color: c.inkDim),
                                const SizedBox(height: 4),
                                Text('${set.pages} хуудас', style: context.text.labelSmall),
                              ],
                            ),
                          )
                        : Image(
                            image: ResizeImage(images.image(key), width: px, allowUpscaling: false),
                            fit: BoxFit.cover,
                            errorBuilder: (_, _, _) => ColoredBox(
                              color: c.surfaceSunken,
                              child: Icon(AppIcons.gallery, color: c.inkDim),
                            ),
                          ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
