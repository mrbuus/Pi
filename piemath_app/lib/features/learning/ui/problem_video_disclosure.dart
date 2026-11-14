import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../data/lesson_models.dart';
import '../data/lesson_repository.dart';
import '../data/problem_video_repository.dart';
import '../domain/video_source.dart';
import 'inline_message.dart';

/// «Бичлэгээр тайлбар» — бодлогод холбосон бичлэгүүд. Вэбийн `ProblemVideoDisclosure`.
///
/// Сүлжээнд ЗӨВХӨН товшоход хандана: эхний товч жагсаалтыг, бичлэгийн мөр товшихыг нээж (`/videos/{id}/open`)
/// YouTube nocookie хаягийг апп доторх хөтөчид нээнэ. Автоматаар ачаалахгүй, тоглуулахгүй.
class ProblemVideoDisclosure extends ConsumerStatefulWidget {
  const ProblemVideoDisclosure({super.key, required this.problemId});

  final String problemId;

  @override
  ConsumerState<ProblemVideoDisclosure> createState() => _ProblemVideoDisclosureState();
}

class _ProblemVideoDisclosureState extends ConsumerState<ProblemVideoDisclosure> {
  bool _open = false;
  bool _busy = false;
  String? _error;
  List<LessonVideo>? _rows;

  Future<void> _reveal() async {
    setState(() {
      _open = true;
      _busy = true;
      _error = null;
    });
    try {
      final rows = await ref.read(problemVideoRepositoryProvider).forProblem(widget.problemId);
      if (mounted) setState(() => _rows = rows);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Бичлэг ачаалсангүй. Дахин оролдоно уу'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _play(LessonVideo row) async {
    if (_busy) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final video = await ref.read(problemVideoRepositoryProvider).open(row.id, widget.problemId);
      final uri = video.unavailable ? null : playableUri(source: video.source, embedUrl: video.embedUrl);
      if (uri == null) {
        messenger.showSnackBar(const SnackBar(content: Text('Бичлэгийн эх сурвалжийг багш шалгах шаардлагатай')));
      } else {
        final ok = await ref.read(videoLauncherProvider).open(uri);
        if (!ok) messenger.showSnackBar(const SnackBar(content: Text('Бичлэгийг нээж чадсангүй. Дахин оролдоно уу')));
      }
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Бичлэг нээгдсэнгүй. Дахин оролдоно уу'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  void _close() => setState(() {
    _open = false;
    _error = null;
  });

  @override
  Widget build(BuildContext context) {
    if (!_open) {
      return Align(
        alignment: AlignmentDirectional.centerStart,
        child: OutlinedButton.icon(
          style: OutlinedButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
          onPressed: _reveal,
          icon: const Icon(AppIcons.video, size: 18),
          label: const Text('Бичлэгээр тайлбар'),
        ),
      );
    }
    final c = context.colors;
    final rows = _rows;
    return Container(
      padding: const EdgeInsets.all(AppSpace.md),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: Text('Бичлэгээр тайлбар', style: context.text.titleSmall)),
              TextButton.icon(
                style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                onPressed: _close,
                icon: const Icon(AppIcons.close, size: 18),
                label: const Text('Хаах'),
              ),
            ],
          ),
          if (_busy && rows == null)
            const Padding(
              padding: EdgeInsets.all(AppSpace.md),
              child: Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5))),
            ),
          if (_error != null) ...[
            InlineMessage(_error!),
            if (rows == null)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton(
                  style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                  onPressed: _busy ? null : _reveal,
                  child: const Text(AppStrings.retry),
                ),
              ),
          ],
          if (rows != null && rows.isEmpty)
            Text(
              'Энэ бодлогод бичлэг хараахан холбогдоогүй',
              style: context.text.bodyMedium?.copyWith(color: c.inkDim),
            ),
          if (rows != null)
            for (final v in rows)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm),
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(0, AppSizes.minTap),
                    alignment: AlignmentDirectional.centerStart,
                  ),
                  onPressed: _busy ? null : () => _play(v),
                  icon: const Icon(AppIcons.play, size: 18),
                  label: Text(
                    v.duration != null && v.duration! > 0 ? '${v.title} (${formatDuration(v.duration!)})' : v.title,
                    textAlign: TextAlign.start,
                  ),
                ),
              ),
          if (rows != null && rows.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Text(
              'Тайлбар нээсэн нь тусламжтай оролдлого гэж бүртгэгдэнэ. Бичлэгийг бүрэн үзсэн гэж тооцохгүй',
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            ),
          ],
        ],
      ),
    );
  }
}
