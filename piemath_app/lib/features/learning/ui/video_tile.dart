import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../data/lesson_models.dart';
import '../data/lesson_repository.dart';
import '../domain/video_source.dart';
import '../learning_icons.dart';

/// Бичлэгийн мөр. Бичлэгийг ЗӨВХӨН товшиход нээнэ (сул сүлжээнд автоматаар ачаалахгүй), YouTube nocookie.
class VideoTile extends ConsumerWidget {
  const VideoTile({super.key, required this.video, this.watched = false, this.onStarted});

  final LessonVideo video;
  final bool watched;
  final VoidCallback? onStarted;

  Future<void> _open(BuildContext context, WidgetRef ref) async {
    final uri = video.unavailable ? null : playableUri(source: video.source, embedUrl: video.embedUrl);
    final messenger = ScaffoldMessenger.of(context);
    if (uri == null) {
      messenger.showSnackBar(const SnackBar(content: Text('Бичлэгийн эх сурвалжийг багш шалгах шаардлагатай')));
      return;
    }
    final ok = await ref.read(videoLauncherProvider).open(uri);
    if (!ok) {
      messenger.showSnackBar(const SnackBar(content: Text('Бичлэгийг нээж чадсангүй. Дахин оролдоно уу')));
      return;
    }
    onStarted?.call();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final usable = !video.unavailable && playableUri(source: video.source, embedUrl: video.embedUrl) != null;
    return AppCard(
      onTap: () => _open(context, ref),
      semanticLabel: 'Бичлэг нээх: ${video.title}',
      child: Row(
        children: [
          Icon(usable ? LearningIcons.play : AppIcons.warning, color: usable ? c.brand : c.inkDim),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(video.title, style: context.text.titleSmall),
                Meta(
                  items: [
                    if (video.duration != null && video.duration! > 0) formatDuration(video.duration!),
                    if (!usable) 'Эх сурвалж шалгагдаж байна' else if (watched) 'Үзсэн',
                  ],
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                ),
              ],
            ),
          ),
          Icon(LearningIcons.open, size: 18, color: c.inkDim),
        ],
      ),
    );
  }
}
