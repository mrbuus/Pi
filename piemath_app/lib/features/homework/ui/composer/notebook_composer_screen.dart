import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/files/files.dart';
import '../../../../core/network/api_error.dart';
import '../../../../core/ui/ui.dart';
import '../../data/photo_processor.dart';
import '../../domain/photo_quality.dart';
import 'crop_screen.dart';

/// Дэвтрийн хуудас бүрийг авч, тайрч, дарааллаа засаад илгээх дэлгэц (UX-RESEARCH §7):
/// «2/6» тоолуур, камераас авмагц тайрах алхам, бүдэг зургийн зөвлөмж, хуудас бүрийг дахин авах,
/// удаан дараад чирж эрэмбэлэх. Гэрийн даалгавар, онол, онлайн даалгавар, нөхөх хичээлд нийтлэг.
/// «PDF» гэдэг үг хүүхдэд харагдахгүй.
class NotebookComposerScreen extends ConsumerStatefulWidget {
  const NotebookComposerScreen({
    super.key,
    required this.title,
    required this.maxPages,
    required this.onSubmit,
    this.subtitle,
    this.noteLabel,
    this.initialNote = '',
    this.submitLabel = 'Илгээх',
  });

  final String title;
  final String? subtitle;
  final int maxPages;
  final PhotoSubmit onSubmit;

  /// null бол тэмдэглэлийн талбаргүй.
  final String? noteLabel;
  final String initialNote;
  final String submitLabel;

  /// Амжилттай илгээвэл `true`.
  static Future<bool> open(
    BuildContext context, {
    required String title,
    required int maxPages,
    required PhotoSubmit onSubmit,
    String? subtitle,
    String? noteLabel,
    String initialNote = '',
    String submitLabel = 'Илгээх',
  }) async {
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (_) => NotebookComposerScreen(
          title: title,
          subtitle: subtitle,
          maxPages: maxPages,
          onSubmit: onSubmit,
          noteLabel: noteLabel,
          initialNote: initialNote,
          submitLabel: submitLabel,
        ),
      ),
    );
    return ok ?? false;
  }

  @override
  ConsumerState<NotebookComposerScreen> createState() => _NotebookComposerScreenState();
}

/// Нэг хуудас ба түүний тод байдлын үзүүлэлт (null = шалгаагүй).
class _Entry {
  _Entry(this.page, this.sharpness);

  PhotoPage page;
  double? sharpness;

  bool get blurry => isBlurry(sharpness);
}

class _NotebookComposerScreenState extends ConsumerState<NotebookComposerScreen> {
  final _entries = <_Entry>[];
  late final _note = TextEditingController(text: widget.initialNote);
  CancelToken? _cancel;
  PhotoUploadPhase? _phase;
  double _progress = 0;
  String? _error;

  bool get _busy => _cancel != null;
  int get _room => widget.maxPages - _entries.length;
  int get _firstBlurry => _entries.indexWhere((e) => e.blurry);

  @override
  void dispose() {
    _cancel?.cancel();
    _note.dispose();
    super.dispose();
  }

  void _permissionOrOpenError(PlatformException e) {
    final denied = e.code.contains('access_denied') || e.code.contains('permission');
    setState(
      () => _error = denied
          ? 'Зураг авах зөвшөөрөл өгөөгүй байна. Утасныхаа Тохиргоо хэсгээс Piemath-д камер, зургийн сангийн зөвшөөрөл өгнө үү.'
          : 'Зургийг нээж чадсангүй. Дахин оролдоно уу.',
    );
  }

  /// Камераар авч, тод эсэхийг шалгаад, тайрах алхмыг үзүүлнэ. «Дахин авах» бол давтана.
  /// Буцаах: хадгалах зураг (null = болиулсан).
  Future<_Entry?> _captureAndCrop() async {
    final processor = ref.read(photoProcessorProvider);
    while (true) {
      final shot = await ref.read(photoSourceProvider).takePhoto();
      if (shot == null || !mounted) return null;
      final sharp = await processor.sharpness(shot.bytes);
      if (!mounted) return null;
      final outcome = await CropScreen.open(context, page: shot, blurry: isBlurry(sharp));
      if (!mounted) return null;
      switch (outcome) {
        case CropApplied(:final page):
          // Тайрсны дараа тод байдлыг дахин хэмжих хэрэггүй — тайрахаас өмнөх үнэлгээг хадгална.
          return _Entry(page, sharp);
        case CropRetake():
          continue;
        case null:
          return null;
      }
    }
  }

  Future<void> _camera() async {
    setState(() => _error = null);
    try {
      final e = await _captureAndCrop();
      if (e != null && mounted && _room > 0) setState(() => _entries.add(e));
    } on PlatformException catch (e) {
      if (mounted) _permissionOrOpenError(e);
    }
  }

  Future<void> _gallery() async {
    setState(() => _error = null);
    try {
      final picked = await ref.read(photoSourceProvider).pickFromGallery(limit: _room);
      if (!mounted || picked.isEmpty) return;
      final processor = ref.read(photoProcessorProvider);
      final added = <_Entry>[];
      for (final p in picked.take(_room)) {
        added.add(_Entry(p, await processor.sharpness(p.bytes)));
      }
      if (mounted) setState(() => _entries.addAll(added));
    } on PlatformException catch (e) {
      if (mounted) _permissionOrOpenError(e);
    }
  }

  Future<void> _retake(int i) async {
    setState(() => _error = null);
    try {
      final e = await _captureAndCrop();
      if (e != null && mounted && i < _entries.length) setState(() => _entries[i] = e);
    } on PlatformException catch (e) {
      if (mounted) _permissionOrOpenError(e);
    }
  }

  Future<void> _recrop(int i) async {
    final entry = _entries[i];
    final outcome = await CropScreen.open(context, page: entry.page, blurry: entry.blurry);
    if (!mounted) return;
    switch (outcome) {
      case CropApplied(:final page):
        setState(() => entry.page = page);
      case CropRetake():
        await _retake(i);
      case null:
        break;
    }
  }

  Future<void> _submit() async {
    final cancel = CancelToken();
    setState(() {
      _cancel = cancel;
      _error = null;
      _phase = PhotoUploadPhase.preparing;
      _progress = 0;
    });
    try {
      await widget.onSubmit([for (final e in _entries) e.page], _note.text.trim(), (phase, p) {
        if (mounted) {
          setState(() {
            _phase = phase;
            _progress = p.clamp(0, 1);
          });
        }
      }, cancel);
      if (mounted) Navigator.of(context).pop(true);
    } on UploadCancelled {
      if (mounted) setState(() => _error = null);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Илгээж чадсангүй. Дахин оролдоно уу.');
    } finally {
      if (mounted) {
        setState(() {
          _cancel = null;
          _phase = null;
        });
      }
    }
  }

  Future<void> _close() async {
    if (_entries.isEmpty) {
      Navigator.of(context).pop(false);
      return;
    }
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Авсан зургуудаа хаях уу?'),
        content: const Text('Гарвал энэ дэлгэц дээрх зургууд устна.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Үргэлжлүүлэх')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Хаях')),
        ],
      ),
    );
    if (yes == true && mounted) Navigator.of(context).pop(false);
  }

  Future<void> _pageActions(int i) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(AppIcons.camera),
              title: const Text('Дахин авах'),
              onTap: () => Navigator.pop(ctx, 'retake'),
            ),
            ListTile(
              leading: const Icon(AppIcons.gallery),
              title: const Text('Тайрах'),
              onTap: () => Navigator.pop(ctx, 'crop'),
            ),
            ListTile(
              leading: const Icon(AppIcons.rotate),
              title: const Text('Эргүүлэх'),
              onTap: () => Navigator.pop(ctx, 'rotate'),
            ),
            if (i > 0)
              ListTile(
                leading: const Icon(AppIcons.back),
                title: const Text('Өмнө нь шилжүүлэх'),
                onTap: () => Navigator.pop(ctx, 'left'),
              ),
            if (i < _entries.length - 1)
              ListTile(
                leading: const Icon(AppIcons.forward),
                title: const Text('Дараа нь шилжүүлэх'),
                onTap: () => Navigator.pop(ctx, 'right'),
              ),
            ListTile(
              leading: Icon(AppIcons.trash, color: ctx.colors.error),
              title: Text('Хасах', style: TextStyle(color: ctx.colors.error)),
              onTap: () => Navigator.pop(ctx, 'remove'),
            ),
          ],
        ),
      ),
    );
    if (!mounted || action == null) return;
    switch (action) {
      case 'retake':
        await _retake(i);
      case 'crop':
        await _recrop(i);
      case 'rotate':
        setState(() => _entries[i].page = _entries[i].page.rotated());
      case 'left':
        setState(() => _entries.insert(i - 1, _entries.removeAt(i)));
      case 'right':
        setState(() => _entries.insert(i + 1, _entries.removeAt(i)));
      case 'remove':
        setState(() => _entries.removeAt(i));
    }
  }

  void _reorder(int from, int to) {
    setState(() => _entries.insert(to, _entries.removeAt(from)));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final blurryAt = _firstBlurry;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !_busy) _close();
      },
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(AppIcons.close),
            tooltip: AppStrings.close,
            onPressed: _busy ? null : _close,
          ),
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(widget.title),
              Text(widget.subtitle ?? '${widget.maxPages} хүртэл хуудас', style: context.text.bodySmall),
            ],
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          children: [
            Row(
              children: [
                Semantics(
                  label: '${_entries.length} хуудас, дээд тал нь ${widget.maxPages}',
                  excludeSemantics: true,
                  child: Text('${_entries.length}/${widget.maxPages}', style: context.text.titleMedium),
                ),
                const SizedBox(width: AppSpace.xs),
                Text('хуудас', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                const Spacer(),
                const InfoHint(
                  title: 'Зураг авах зөвлөмж',
                  message:
                      'Хуудас бүрийг тод, бүтнээр нь, гэрэлтэй газар зураарай. '
                      'Хуудсыг товшвол дахин авах, тайрах, эргүүлэх, хасах сонголт гарна. '
                      'Удаан дараад чирвэл дараалал солигдоно',
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            if (_entries.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.xl),
                child: Text(
                  'Дэвтрийнхээ хуудас бүрийг ойртуулж, гэрэлтэй газар тод зураарай',
                  style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                  textAlign: TextAlign.center,
                ),
              )
            else
              SizedBox(
                height: 168,
                child: ReorderableListView.builder(
                  scrollDirection: Axis.horizontal,
                  buildDefaultDragHandles: false,
                  itemCount: _entries.length,
                  onReorderItem: _busy ? (_, _) {} : _reorder,
                  proxyDecorator: (child, _, _) => Material(type: MaterialType.transparency, child: child),
                  itemBuilder: (context, i) {
                    final e = _entries[i];
                    return ReorderableDelayedDragStartListener(
                      key: ObjectKey(e),
                      index: i,
                      enabled: !_busy,
                      child: Padding(
                        padding: const EdgeInsets.only(right: AppSpace.sm),
                        child: _Thumb(
                          page: e.page,
                          number: i + 1,
                          blurry: e.blurry,
                          onTap: _busy ? null : () => _pageActions(i),
                        ),
                      ),
                    );
                  },
                ),
              ),
            if (blurryAt >= 0) ...[
              const SizedBox(height: AppSpace.md),
              Semantics(
                liveRegion: true,
                child: Container(
                  padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.xs, AppSpace.xs, AppSpace.xs),
                  decoration: BoxDecoration(
                    border: Border.all(color: c.line),
                    borderRadius: BorderRadius.circular(AppRadius.md),
                  ),
                  child: Row(
                    children: [
                      Icon(AppIcons.warning, size: 18, color: c.warning),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(
                        child: Text('${blurryAt + 1}-р хуудас бүдэг харагдаж байна', style: context.text.bodySmall),
                      ),
                      TextButton(onPressed: _busy ? null : () => _retake(blurryAt), child: const Text('Дахин авах')),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: AppSpace.lg),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _busy || _room <= 0 ? null : _camera,
                    icon: const Icon(AppIcons.camera, size: 18),
                    label: const Text('Камер'),
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _busy || _room <= 0 ? null : _gallery,
                    icon: const Icon(AppIcons.gallery, size: 18),
                    label: const Text('Зургийн сан'),
                  ),
                ),
              ],
            ),
            if (_room <= 0)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm),
                child: Text('${widget.maxPages} хуудас хүрлээ', style: context.text.bodySmall),
              ),
            if (widget.noteLabel != null) ...[
              const SizedBox(height: AppSpace.lg),
              TextField(
                controller: _note,
                enabled: !_busy,
                minLines: 2,
                maxLines: 5,
                maxLength: 2000,
                decoration: InputDecoration(labelText: widget.noteLabel),
              ),
            ],
            if (_error != null) ...[
              const SizedBox(height: AppSpace.md),
              Semantics(
                liveRegion: true,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(AppIcons.error, size: 18, color: c.error),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
        bottomNavigationBar: SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.md),
            child: _busy
                ? Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${_phase?.label ?? PhotoUploadPhase.preparing.label} ${(_progress * 100).round()}%',
                        style: context.text.bodyMedium,
                      ),
                      const SizedBox(height: AppSpace.sm),
                      LinearProgressIndicator(value: _progress),
                      const SizedBox(height: AppSpace.sm),
                      TextButton(onPressed: () => _cancel?.cancel(), child: const Text(AppStrings.cancel)),
                    ],
                  )
                : FilledButton.icon(
                    onPressed: _entries.isEmpty ? null : _submit,
                    icon: const Icon(AppIcons.send, size: 18),
                    label: Text(
                      _entries.isEmpty ? widget.submitLabel : '${widget.submitLabel} (${_entries.length} хуудас)',
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.page, required this.number, required this.blurry, required this.onTap});

  final PhotoPage page;
  final int number;
  final bool blurry;
  final VoidCallback? onTap;

  static const _width = 126.0;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final px = (_width * MediaQuery.devicePixelRatioOf(context)).round();
    return Semantics(
      button: true,
      label: '$number-р хуудас${blurry ? ', бүдэг' : ''}. Дахин авах, тайрах, эргүүлэх, шилжүүлэх, хасах',
      child: SizedBox(
        width: _width,
        child: Material(
          color: c.surfaceSunken,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppRadius.md),
            side: BorderSide(color: blurry ? c.warning : c.line),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: onTap,
            child: Stack(
              fit: StackFit.expand,
              children: [
                RotatedBox(
                  quarterTurns: page.rotation ~/ 90,
                  child: Image.memory(page.bytes, fit: BoxFit.cover, cacheWidth: px, gaplessPlayback: true),
                ),
                Positioned(
                  left: AppSpace.xs,
                  top: AppSpace.xs,
                  child: DecoratedBox(
                    decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(AppRadius.sm)),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      child: Text('$number', style: context.text.labelMedium),
                    ),
                  ),
                ),
                if (blurry)
                  Positioned(
                    right: AppSpace.xs,
                    top: AppSpace.xs,
                    child: DecoratedBox(
                      decoration: BoxDecoration(color: c.surface, borderRadius: BorderRadius.circular(AppRadius.sm)),
                      child: Padding(
                        padding: const EdgeInsets.all(3),
                        child: Icon(AppIcons.warning, size: 16, color: c.warning),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
