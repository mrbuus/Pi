import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../network/api_error.dart';
import '../../ui/ui.dart';
import '../file_uploader.dart';
import '../photo_document.dart';
import '../photo_set_upload.dart';
import '../photo_source.dart';
import 'file_icons.dart';

/// Илгээх үйлдэл: зургууд, тэмдэглэл, явц, цуцлах токен.
typedef PhotoSubmit = Future<void> Function(
  List<PhotoPage> pages,
  String note,
  PhotoUploadProgress onProgress,
  CancelToken cancel,
);

/// Дэвтрийн/самбарын зургаа камераар эсвэл зургийн сангаас сонгож, эргүүлж, дарааллаа засаад илгээх дэлгэц.
/// Гэрийн даалгавар, онолын зураг, онлайн даалгаварт нийтлэг.
class PhotoComposerScreen extends ConsumerStatefulWidget {
  const PhotoComposerScreen({
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
        builder: (_) => PhotoComposerScreen(
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
  ConsumerState<PhotoComposerScreen> createState() => _PhotoComposerScreenState();
}

class _PhotoComposerScreenState extends ConsumerState<PhotoComposerScreen> {
  final _pages = <PhotoPage>[];
  late final _note = TextEditingController(text: widget.initialNote);
  CancelToken? _cancel;
  PhotoUploadPhase? _phase;
  double _progress = 0;
  String? _error;

  bool get _busy => _cancel != null;
  int get _room => widget.maxPages - _pages.length;

  @override
  void dispose() {
    _cancel?.cancel();
    _note.dispose();
    super.dispose();
  }

  Future<void> _add(Future<List<PhotoPage>> Function() pick) async {
    setState(() => _error = null);
    try {
      final picked = await pick();
      if (!mounted || picked.isEmpty) return;
      setState(() => _pages.addAll(picked.take(_room)));
    } on PlatformException catch (e) {
      if (!mounted) return;
      final denied = e.code.contains('access_denied') || e.code.contains('permission');
      setState(
        () => _error = denied
            ? 'Зураг авах зөвшөөрөл өгөөгүй байна. Утасныхаа Тохиргоо хэсгээс Piemath-д камер, зургийн сангийн зөвшөөрөл өгнө үү.'
            : 'Зургийг нээж чадсангүй. Дахин оролдоно уу.',
      );
    }
  }

  Future<void> _camera() => _add(() async {
        final p = await ref.read(photoSourceProvider).takePhoto();
        return p == null ? const <PhotoPage>[] : [p];
      });

  Future<void> _gallery() => _add(() => ref.read(photoSourceProvider).pickFromGallery(limit: _room));

  Future<void> _submit() async {
    final cancel = CancelToken();
    setState(() {
      _cancel = cancel;
      _error = null;
      _phase = PhotoUploadPhase.preparing;
      _progress = 0;
    });
    try {
      await widget.onSubmit(List.of(_pages), _note.text.trim(), (phase, p) {
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

  Future<void> _pageActions(int i) async {
    final action = await showModalBottomSheet<String>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(leading: const Icon(FileIcons.rotate), title: const Text('Эргүүлэх'), onTap: () => Navigator.pop(ctx, 'rotate')),
            if (i > 0)
              ListTile(leading: const Icon(FileIcons.moveLeft), title: const Text('Өмнө нь шилжүүлэх'), onTap: () => Navigator.pop(ctx, 'left')),
            if (i < _pages.length - 1)
              ListTile(leading: const Icon(FileIcons.moveRight), title: const Text('Дараа нь шилжүүлэх'), onTap: () => Navigator.pop(ctx, 'right')),
            ListTile(
              leading: Icon(FileIcons.remove, color: ctx.colors.error),
              title: Text('Хасах', style: TextStyle(color: ctx.colors.error)),
              onTap: () => Navigator.pop(ctx, 'remove'),
            ),
          ],
        ),
      ),
    );
    if (!mounted || action == null) return;
    setState(() {
      switch (action) {
        case 'rotate':
          _pages[i] = _pages[i].rotated();
        case 'left':
          _pages.insert(i - 1, _pages.removeAt(i));
        case 'right':
          _pages.insert(i + 1, _pages.removeAt(i));
        case 'remove':
          _pages.removeAt(i);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return PopScope(
      canPop: !_busy,
      child: Scaffold(
        appBar: AppBar(
          leading: IconButton(
            icon: const Icon(AppIcons.close),
            tooltip: AppStrings.close,
            onPressed: _busy ? null : () => Navigator.of(context).pop(false),
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
            if (_pages.isEmpty)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.xl),
                child: Text(
                  'Дэвтрийнхээ хуудас бүрийг тод, бүтнээр нь зураарай',
                  style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                  textAlign: TextAlign.center,
                ),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _pages.length,
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 140,
                  mainAxisSpacing: AppSpace.sm,
                  crossAxisSpacing: AppSpace.sm,
                  childAspectRatio: 3 / 4,
                ),
                itemBuilder: (context, i) => _Thumb(
                  page: _pages[i],
                  number: i + 1,
                  onTap: _busy ? null : () => _pageActions(i),
                ),
              ),
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
                    Expanded(child: Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error))),
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
                    onPressed: _pages.isEmpty ? null : _submit,
                    icon: const Icon(FileIcons.send, size: 18),
                    label: Text(_pages.isEmpty ? widget.submitLabel : '${widget.submitLabel} (${_pages.length} хуудас)'),
                  ),
          ),
        ),
      ),
    );
  }
}

class _Thumb extends StatelessWidget {
  const _Thumb({required this.page, required this.number, required this.onTap});

  final PhotoPage page;
  final int number;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final px = (140 * MediaQuery.devicePixelRatioOf(context)).round();
    return Semantics(
      button: true,
      label: '$number-р хуудас. Эргүүлэх, шилжүүлэх, хасах',
      child: Material(
        color: c.surfaceSunken,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(AppRadius.md), side: BorderSide(color: c.line)),
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
            ],
          ),
        ),
      ),
    );
  }
}

/// Байршуулах зориулалтын товч нэр (файлын нэрэнд).
String uploadFileName(String prefix, String date) => '$prefix-$date.pdf';

/// [PhotoSetUploader]-ийг composer-ийн явцад холбох туслах.
Future<(UploadedFile, int)> uploadPhotoSet(
  WidgetRef ref,
  List<PhotoPage> pages, {
  required UploadPurpose purpose,
  required int maxPages,
  required String fileName,
  required PhotoUploadProgress onProgress,
  required CancelToken cancel,
}) {
  return ref.read(photoSetUploaderProvider).upload(
        pages,
        purpose: purpose,
        maxPages: maxPages,
        fileName: fileName,
        onProgress: onProgress,
        cancel: cancel,
      );
}
