import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/content_providers.dart';
import '../data/content_models.dart';
import 'content_widgets.dart';
import 'placement_admin_screen.dart';

/// Нэг хүүхдийн түвшин тогтоох шалгалт (`/app/admin/placement/:id`): холбоо барих, бодлого бүрийн хариу,
/// бодолтын зураг, багшийн дүгнэлт (түвшин, төлөв, тэмдэглэл).
class PlacementDetailScreen extends ConsumerWidget {
  const PlacementDetailScreen({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = isSafeId(id) ? ref.watch(placementDetailProvider(id)) : null;
    return Scaffold(
      appBar: AppBar(title: const Text('Түвшин тогтоох')),
      body: async == null
          ? const EmptyState(icon: AppIcons.fileQuestion, title: AppStrings.notFound)
          : AsyncBody<PlacementDetail>(
              value: async,
              onRetry: () => ref.invalidate(placementDetailProvider(id)),
              data: (d) => _Body(id: id, detail: d),
            ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.id, required this.detail});

  final String id;
  final PlacementDetail detail;

  @override
  Widget build(BuildContext context) {
    final a = detail.attempt;
    final used = detail.usedMinutes;
    return ListView(
      padding: const EdgeInsets.only(bottom: AppSpace.xxl),
      children: [
        DetailHeader(
          title: a.name,
          subtitle: ['${a.grade}-р анги', a.school],
          chips: [
            placementStatusChip(a.status),
            MetaChip(label: a.scoreLabel, tone: ChipTone.brand),
            MetaChip(label: used == null ? 'Илгээгээгүй' : '$used мин / ${detail.minutes} мин', icon: AppIcons.timer),
            if (a.autoSubmitted) const MetaChip(label: 'Хугацаа дуусаж илгээгдсэн', tone: ChipTone.warning),
          ],
          primary: a.phone.isEmpty
              ? null
              : DetailAction(
                  icon: AppIcons.phone,
                  label: a.phone,
                  onPressed: () => launchUrl(Uri(scheme: 'tel', path: a.phone)),
                ),
          secondary: [
            if (a.parentPhone != null && a.parentPhone!.isNotEmpty)
              DetailAction(
                icon: AppIcons.phone,
                label: 'Эцэг эх ${a.parentPhone}',
                onPressed: () => launchUrl(Uri(scheme: 'tel', path: a.parentPhone)),
              ),
          ],
        ),
        for (final p in detail.problems)
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.sm),
            child: _ProblemCard(item: p, name: a.name),
          ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
          child: _ReviewForm(id: id, detail: detail),
        ),
      ],
    );
  }
}

class _ProblemCard extends StatelessWidget {
  const _ProblemCard({required this.item, required this.name});

  final PlacementDetailProblem item;
  final String name;

  @override
  Widget build(BuildContext context) {
    final p = item.problem;
    final c = context.colors;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${p.n}.', style: context.text.titleSmall),
              const SizedBox(width: AppSpace.sm),
              Expanded(child: MathText(p.statement)),
              const SizedBox(width: AppSpace.sm),
              MetaChip(
                label: item.unanswered ? 'Хариугүй' : (item.correct ? 'Зөв' : 'Буруу'),
                tone: item.unanswered ? ChipTone.neutral : (item.correct ? ChipTone.success : ChipTone.error),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Meta(
            items: ['Хүүхдийн хариу: ${p.formatAnswer(item.given)}', 'Зөв хариу: ${p.formatAnswer(p.correctAnswer)}'],
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
          ),
          const SizedBox(height: AppSpace.sm),
          if (item.photos.isEmpty)
            Row(
              children: [
                Icon(AppIcons.cameraOff, size: 16, color: c.error),
                const SizedBox(width: AppSpace.xs),
                Expanded(
                  child: Text(
                    'Бодолтын зураг алга, чадаагүй гэж үзнэ',
                    style: context.text.bodySmall?.copyWith(color: c.error),
                  ),
                ),
              ],
            )
          else
            SizedBox(
              height: 160,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: item.photos.length,
                separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
                itemBuilder: (context, i) => SizedBox(
                  width: 120,
                  child: InkWell(
                    onTap: () =>
                        FileGalleryScreen.open(context, fileKeys: item.photos, title: '$name, ${p.n}-р бодлого'),
                    child: FileImageView(
                      item.photos[i],
                      aspectRatio: null,
                      semanticLabel: '$name, ${p.n}-р бодлогын бодолт ${i + 1}',
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _ReviewForm extends ConsumerStatefulWidget {
  const _ReviewForm({required this.id, required this.detail});

  final String id;
  final PlacementDetail detail;

  @override
  ConsumerState<_ReviewForm> createState() => _ReviewFormState();
}

class _ReviewFormState extends ConsumerState<_ReviewForm> {
  late PlacementStatus _status = widget.detail.attempt.status == PlacementStatus.newOne
      ? PlacementStatus.reviewed
      : widget.detail.attempt.status;
  late final _level = TextEditingController(text: widget.detail.attempt.level ?? '');
  late final _note = TextEditingController(text: widget.detail.teacherNote ?? '');
  bool _busy = false;

  @override
  void dispose() {
    _level.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      await ref
          .read(contentRepositoryProvider)
          .reviewPlacement(widget.id, status: _status, level: _level.text.trim(), note: _note.text.trim());
      if (!mounted) return;
      contentSnack(context, 'Хадгаллаа');
      ref
        ..invalidate(placementDetailProvider(widget.id))
        ..invalidate(placementsProvider);
    } catch (e) {
      if (mounted) contentSnack(context, contentError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader(title: 'Багшийн дүгнэлт'),
        TextField(
          controller: _level,
          maxLength: 80,
          decoration: const InputDecoration(labelText: 'Түвшин', hintText: 'Жишээ: Дунд'),
        ),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.xs,
          children: [
            for (final l in placementLevels)
              ActionChip(label: Text(l), onPressed: () => setState(() => _level.text = l)),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        SegmentedButton<PlacementStatus>(
          segments: [for (final s in PlacementStatus.values) ButtonSegment(value: s, label: Text(s.label))],
          selected: {_status},
          onSelectionChanged: (v) => setState(() => _status = v.first),
        ),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: _note,
          minLines: 3,
          maxLines: 6,
          maxLength: 2000,
          decoration: const InputDecoration(
            labelText: 'Тэмдэглэл, санал болгох анги',
            alignLabelWithHint: true,
            hintText: 'Жишээ: Квадрат тэгшитгэл сайн, бутархайтай тэгшитгэлд алдаатай',
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        FilledButton.icon(
          onPressed: _busy ? null : _save,
          icon: const Icon(AppIcons.save, size: 18),
          label: Text(_busy ? 'Хадгалж байна' : AppStrings.save),
        ),
      ],
    );
  }
}
