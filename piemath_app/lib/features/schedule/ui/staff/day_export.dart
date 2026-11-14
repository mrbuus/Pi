import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../../../core/ui/ui.dart';
import '../../../../shared/native/native.dart';
import '../../data/staff_schedule_models.dart';
import '../../domain/day_export.dart';

/// Зургийн түр хавтас (тестэд солино).
final dayExportDirProvider = Provider<Future<Directory> Function()>((ref) => getTemporaryDirectory);

/// «Зураг хуваалцах» (вэбийн `day/ExportImage.tsx`, эзэн 2026-11-08): өдрийн хуваарийг урьдчилан харуулаад
/// PNG болгож системийн «Хуваалцах» цонхоор (Photos, Gallery, мессенжер) илгээнэ. Тарах/үлдэнэ, тэмдэглэл нь
/// ажилтны мэдээлэл — зургийг багш нарын группт хуваалцана. Танхим зурагт ОРОХГҮЙ.
Future<void> openDayExport(BuildContext context, DayPlan plan) =>
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => DayExportScreen(plan: plan)));

class DayExportScreen extends ConsumerStatefulWidget {
  const DayExportScreen({super.key, required this.plan});

  final DayPlan plan;

  /// Зургийн өргөн (логик цэг) ба нягт — 720-ийг 1.5 дахин = 1080 цэг өргөн PNG.
  static const imageWidth = 720.0;
  static const pixelRatio = 1.5;

  @override
  ConsumerState<DayExportScreen> createState() => _DayExportScreenState();
}

class _DayExportScreenState extends ConsumerState<DayExportScreen> {
  final _boundary = GlobalKey();
  late final DayExportModel _model = dayExportModel(widget.plan);
  bool _busy = false;

  Future<File> _render() async {
    final box = _boundary.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final image = await box.toImage(pixelRatio: DayExportScreen.pixelRatio);
    try {
      final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
      if (bytes == null) throw StateError('png');
      final base = await ref.read(dayExportDirProvider)();
      final dir = Directory('${base.path}/piemath_share');
      if (!dir.existsSync()) dir.createSync(recursive: true);
      final file = File('${dir.path}/${dayExportFileName(widget.plan.date)}');
      await file.writeAsBytes(bytes.buffer.asUint8List(), flush: true);
      return file;
    } finally {
      image.dispose();
    }
  }

  Future<void> _share(BuildContext buttonContext) async {
    final messenger = ScaffoldMessenger.of(context);
    final launcher = ref.read(shareLauncherProvider);
    final rb = buttonContext.findRenderObject() as RenderBox?;
    final origin = rb == null ? null : rb.localToGlobal(Offset.zero) & rb.size;
    setState(() => _busy = true);
    try {
      final file = await _render();
      final ok = await launcher.shareFile(
        file,
        mimeType: 'image/png',
        subject: 'Хуваарь ${_model.title}',
        origin: origin,
      );
      if (!ok) messenger.showSnackBar(const SnackBar(content: Text('Энэ утсанд хуваалцах боломжгүй байна')));
    } catch (_) {
      messenger.showSnackBar(const SnackBar(content: Text('Зураг үүсгэж чадсангүй. Дахин оролдоно уу')));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Хуваарийн зураг')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        child: DecoratedBox(
          decoration: BoxDecoration(
            border: Border.all(color: context.colors.line),
            borderRadius: BorderRadius.circular(AppRadius.md),
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: FittedBox(
              fit: BoxFit.fitWidth,
              alignment: Alignment.topCenter,
              child: RepaintBoundary(
                key: _boundary,
                child: SizedBox(
                  width: DayExportScreen.imageWidth,
                  child: DayExportView(model: _model),
                ),
              ),
            ),
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).maybePop(),
                  child: const Text(AppStrings.close),
                ),
              ),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Builder(
                  builder: (buttonContext) => FilledButton.icon(
                    key: const ValueKey('day-export:share'),
                    onPressed: _busy ? null : () => unawaited(_share(buttonContext)),
                    icon: const Icon(AppIcons.share, size: 18),
                    label: Text(_busy ? 'Бэлтгэж байна' : 'Хуваалцах'),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Зургийн агуулга — үргэлж цагаан горимоор (группт хуваалцахад нэг ижил харагдана).
class DayExportView extends StatelessWidget {
  const DayExportView({super.key, required this.model});

  final DayExportModel model;

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: AppTheme.light(),
      child: Builder(
        builder: (context) {
          final c = context.colors;
          final t = context.text;
          return ColoredBox(
            color: c.surface,
            child: Padding(
              padding: const EdgeInsets.all(28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Хичээлийн хуваарь, ${model.year}',
                    style: t.titleSmall?.copyWith(color: c.brand, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: AppSpace.xs),
                  Text(model.title, style: t.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
                  for (final n in model.notices)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpace.xs),
                      child: Text(n, style: t.titleSmall?.copyWith(color: c.warning)),
                    ),
                  for (final b in model.branches) ...[
                    const SizedBox(height: AppSpace.lg),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(b.name, style: t.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                        const SizedBox(width: AppSpace.md),
                        Text('${b.count} хичээл', style: t.bodyMedium?.copyWith(color: c.inkDim)),
                      ],
                    ),
                    for (final blk in b.blocks) _Block(block: blk),
                  ],
                  if (model.footer.isNotEmpty) ...[
                    const SizedBox(height: AppSpace.lg),
                    for (final f in model.footer)
                      Padding(
                        padding: const EdgeInsets.only(top: AppSpace.xs),
                        child: Text('${f.label}: ${f.text}', style: t.bodyMedium?.copyWith(color: c.inkDim)),
                      ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

const _classW = 120.0;
const _staffW = 110.0;

class _Block extends StatelessWidget {
  const _Block({required this.block});

  final ExportBlock block;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final t = context.text;
    final head = t.labelMedium?.copyWith(color: c.inkDim, fontWeight: FontWeight.w600);
    return Container(
      margin: const EdgeInsets.only(top: AppSpace.md),
      decoration: BoxDecoration(
        border: Border.all(color: c.line, width: 1.5),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
            decoration: BoxDecoration(
              color: c.surfaceSunken,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(AppRadius.md)),
            ),
            child: Row(
              children: [
                SizedBox(
                  width: _classW,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(block.time, style: t.titleSmall?.copyWith(fontWeight: FontWeight.w800)),
                      Text('${block.rows.length} анги', style: head),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpace.md),
                Expanded(child: Text('Тест', style: head)),
                SizedBox(
                  width: _staffW,
                  child: Text('Ахлах багш', style: head),
                ),
                const SizedBox(width: AppSpace.sm),
                SizedBox(
                  width: _staffW,
                  child: Text('Туслах багш', style: head),
                ),
              ],
            ),
          ),
          for (final (i, r) in block.rows.indexed) ...[if (i > 0) Divider(height: 1, color: c.line), _Row(row: r)],
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.row});

  final ExportRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final t = context.text;
    Color tone(ExportTone x) => switch (x) {
      ExportTone.info => c.brand,
      ExportTone.warn => c.warning,
      ExportTone.dim => c.inkDim,
    };
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: _classW,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.className, style: t.titleMedium?.copyWith(fontWeight: FontWeight.w800)),
                Text(row.sub, style: t.bodySmall?.copyWith(color: c.inkDim)),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (row.done && row.tests.isNotEmpty) ...[
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Icon(AppIcons.check, size: 16, color: c.success),
                      ),
                      const SizedBox(width: AppSpace.xs),
                    ],
                    Expanded(
                      child: Text(
                        row.tests.isEmpty ? 'Тест сонгоогүй' : row.tests,
                        style: t.bodyMedium?.copyWith(
                          fontWeight: row.tests.isEmpty ? null : FontWeight.w600,
                          color: row.tests.isEmpty ? c.inkDim : c.ink,
                        ),
                      ),
                    ),
                  ],
                ),
                for (final x in row.extras)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      x.label.isEmpty ? x.text : '${x.label}: ${x.text}',
                      style: t.bodySmall?.copyWith(color: tone(x.tone), fontWeight: FontWeight.w600),
                    ),
                  ),
              ],
            ),
          ),
          SizedBox(
            width: _staffW,
            child: Text(row.lead, style: t.bodyMedium),
          ),
          const SizedBox(width: AppSpace.sm),
          SizedBox(
            width: _staffW,
            child: Text(row.assistant, style: t.bodyMedium?.copyWith(color: c.inkDim)),
          ),
        ],
      ),
    );
  }
}
