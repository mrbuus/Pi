import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/files/files.dart';
import '../../../core/math/math_text.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/parent_history.dart';
import '../data/parent_repository.dart';

/// Хүүхдийн бүлгийн онол, зураг (`/app/parent/theory?studentId=&chapterId=`, вэбийн `ChildHistory` «онол»).
/// Эрх (баталгаажсан хүүхэд, хүүхдийн эрх) — сервер.
class ParentTheoryScreen extends ConsumerWidget {
  const ParentTheoryScreen({super.key, required this.studentId, required this.chapterId});

  final String studentId;
  final String chapterId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = (studentId: studentId, chapterId: chapterId);
    final async = ref.watch(childTheoryProvider(key));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Онол')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => e is ApiError && e.kind == ApiErrorKind.forbidden
            ? const EmptyState(
                icon: AppIcons.info,
                title: 'Энэ онол танд харагдахгүй',
                message: 'Хүүхэд энэ бүлгийг үзэх эрхтэй болмогц энд харагдана.',
              )
            : ErrorState(
                message: e is ApiError ? e.message : AppStrings.genericError,
                onRetry: () => ref.invalidate(childTheoryProvider(key)),
              ),
        data: (t) => _TheoryBody(theory: t),
      ),
    );
  }
}

class _TheoryBody extends StatelessWidget {
  const _TheoryBody({required this.theory});

  final ChildTheory theory;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
      children: [
        Semantics(header: true, child: Text(theory.chapterTitle, style: context.text.titleLarge)),
        const SizedBox(height: AppSpace.md),
        if (theory.blocks.isEmpty)
          const AppCard(
            child: SizedBox(
              height: 200,
              child: EmptyState(icon: AppIcons.theory, title: 'Онол хараахан нэмээгүй'),
            ),
          ),
        for (final b in theory.blocks) ...[
          AppCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (b.title.isNotEmpty) Text(b.title, style: context.text.titleMedium),
                if (b.content.isNotEmpty) ...[const SizedBox(height: AppSpace.sm), MathText(b.content)],
                if (b.imageKeys.isNotEmpty) ...[
                  const SizedBox(height: AppSpace.md),
                  PhotoStrip(fileKeys: b.imageKeys, title: b.title.isEmpty ? theory.chapterTitle : b.title),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpace.md),
        ],
      ],
    );
  }
}

/// Зургийн жижиг хэлхээ; товшвол бүтэн галерей.
class PhotoStrip extends ConsumerWidget {
  const PhotoStrip({super.key, required this.fileKeys, required this.title});

  final List<String> fileKeys;
  final String title;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final images = ref.watch(fileImageProvider);
    return SizedBox(
      height: 96,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: fileKeys.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
        itemBuilder: (context, i) => Semantics(
          button: true,
          label: '$title, ${i + 1}-р зураг',
          excludeSemantics: true,
          child: InkWell(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            onTap: () => FileGalleryScreen.open(context, fileKeys: fileKeys, title: title),
            child: ClipRRect(
              borderRadius: BorderRadius.circular(AppRadius.sm),
              child: Image(
                image: images.image(fileKeys[i]),
                width: 96,
                height: 96,
                fit: BoxFit.cover,
                errorBuilder: (context, _, _) => Container(
                  width: 96,
                  height: 96,
                  color: context.colors.line,
                  alignment: Alignment.center,
                  child: Icon(AppIcons.gallery, color: context.colors.inkDim),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
