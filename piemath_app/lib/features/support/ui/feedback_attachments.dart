import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/file_uploader.dart';
import '../../../core/files/photo_document.dart';
import '../../../core/files/photo_source.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';

/// Санал хүсэлтэд хавсаргах зургийн дээд тоо (сервер: `attachmentKeys` ихдээ 3).
const maxFeedbackAttachments = 3;

enum AttachmentState { uploading, done, failed }

class FeedbackAttachment {
  FeedbackAttachment({required this.id, required this.bytes, required this.name, required this.mime});

  final int id;
  final Uint8List bytes;
  final String name;
  final String mime;
  AttachmentState state = AttachmentState.uploading;
  String? key;
  String? error;
}

/// Сервер зөвхөн JPG, PNG, GIF, WEBP зөвшөөрнө (HEIC, PDF үгүй). Танигдахгүй нэрийг JPEG гэж үзнэ —
/// image_picker шахахдаа JPEG болгодог.
({String name, String mime}) imageUploadMeta(String rawName) {
  final lower = rawName.toLowerCase();
  const known = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
  };
  final dot = lower.lastIndexOf('.');
  final ext = dot < 0 ? '' : lower.substring(dot + 1);
  final mime = known[ext];
  if (mime != null) return (name: rawName, mime: mime);
  return (name: 'zurag.jpg', mime: 'image/jpeg');
}

/// Хавсралтын төлөв: сонгосон зураг тус бүрийг шууд `FileUploader`-аар (purpose: general) байршуулж,
/// амжилттай түлхүүрүүдийг `attachmentKeys` болгон өгнө.
class FeedbackAttachmentsController extends ChangeNotifier {
  FeedbackAttachmentsController(this._uploader);

  final FileUploader _uploader;
  final items = <FeedbackAttachment>[];
  var _seq = 0;
  var _disposed = false;

  int get remaining => maxFeedbackAttachments - items.length;
  bool get canAdd => remaining > 0;
  bool get uploading => items.any((a) => a.state == AttachmentState.uploading);
  bool get hasFailed => items.any((a) => a.state == AttachmentState.failed);

  /// Илгээхэд бэлэн түлхүүрүүд (давхардалгүй).
  List<String> get keys => [
    ...{
      for (final a in items)
        if (a.state == AttachmentState.done && a.key != null) a.key!,
    },
  ];

  void addAll(List<PhotoPage> pages) {
    for (final p in pages.take(remaining)) {
      final meta = imageUploadMeta(p.name);
      final a = FeedbackAttachment(id: ++_seq, bytes: p.bytes, name: meta.name, mime: meta.mime);
      items.add(a);
      unawaited(_upload(a));
    }
    _notify();
  }

  Future<void> _upload(FeedbackAttachment a) async {
    a
      ..state = AttachmentState.uploading
      ..error = null;
    _notify();
    try {
      final f = await _uploader.upload(bytes: a.bytes, name: a.name, mime: a.mime, purpose: UploadPurpose.general);
      a
        ..key = f.key
        ..state = AttachmentState.done;
    } on UploadCancelled {
      items.remove(a);
    } on ApiError catch (e) {
      a
        ..state = AttachmentState.failed
        ..error = e.message;
    } on Object {
      a
        ..state = AttachmentState.failed
        ..error = AppStrings.genericError;
    }
    _notify();
  }

  void retry(FeedbackAttachment a) => unawaited(_upload(a));

  void remove(FeedbackAttachment a) {
    items.remove(a);
    _notify();
  }

  void clear() {
    items.clear();
    _notify();
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }
}

/// «Зураг хавсаргах» хэсэг: камер/галерей товч + жижиг харагдац (устгах, дахин оролдох).
class FeedbackAttachmentsField extends ConsumerStatefulWidget {
  const FeedbackAttachmentsField({super.key, required this.controller, this.enabled = true});

  final FeedbackAttachmentsController controller;
  final bool enabled;

  @override
  ConsumerState<FeedbackAttachmentsField> createState() => _FeedbackAttachmentsFieldState();
}

class _FeedbackAttachmentsFieldState extends ConsumerState<FeedbackAttachmentsField> {
  String? _pickError;

  Future<void> _pick(Future<List<PhotoPage>> Function(PhotoSource s) read) async {
    setState(() => _pickError = null);
    try {
      final pages = await read(ref.read(photoSourceProvider));
      if (!mounted) return;
      widget.controller.addAll(pages);
    } on Object {
      if (mounted) setState(() => _pickError = 'Зураг авч чадсангүй. Камер, зургийн сангийн зөвшөөрлөө шалгана уу.');
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.controller,
      builder: (context, _) {
        final c = widget.controller;
        final canAdd = widget.enabled && c.canAdd;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(AppIcons.imagePlus, size: 18, color: context.colors.inkDim),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Text(
                    'Зураг хавсаргах (${c.items.length}/$maxFeedbackAttachments)',
                    style: context.text.labelLarge,
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                OutlinedButton.icon(
                  onPressed: canAdd ? () => _pick((s) async => [?await s.takePhoto()]) : null,
                  icon: const Icon(AppIcons.camera, size: 18),
                  label: const Text('Камер'),
                ),
                OutlinedButton.icon(
                  onPressed: canAdd ? () => _pick((s) => s.pickFromGallery(limit: c.remaining)) : null,
                  icon: const Icon(AppIcons.gallery, size: 18),
                  label: const Text('Галерей'),
                ),
              ],
            ),
            if (_pickError != null) ...[
              const SizedBox(height: AppSpace.sm),
              Semantics(
                liveRegion: true,
                child: Text(_pickError!, style: context.text.bodySmall?.copyWith(color: context.colors.error)),
              ),
            ],
            if (c.items.isNotEmpty) ...[
              const SizedBox(height: AppSpace.md),
              for (final a in c.items) _Row(attachment: a, controller: c, enabled: widget.enabled),
            ],
          ],
        );
      },
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.attachment, required this.controller, required this.enabled});

  final FeedbackAttachment attachment;
  final FeedbackAttachmentsController controller;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final a = attachment;
    final (status, color) = switch (a.state) {
      AttachmentState.uploading => ('Илгээж байна', c.inkDim),
      AttachmentState.done => ('Хавсарсан', c.success),
      AttachmentState.failed => (a.error ?? AppStrings.genericError, c.error),
    };
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.sm),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            child: SizedBox.square(
              dimension: 56,
              child: Image.memory(
                a.bytes,
                fit: BoxFit.cover,
                cacheWidth: 112,
                excludeFromSemantics: true,
                errorBuilder: (_, _, _) => ColoredBox(
                  color: c.line,
                  child: Icon(AppIcons.gallery, color: c.inkDim),
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Semantics(
              liveRegion: true,
              child: Text(status, style: context.text.bodySmall?.copyWith(color: color)),
            ),
          ),
          if (a.state == AttachmentState.failed)
            IconButton(
              tooltip: 'Дахин оролдох',
              constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
              icon: const Icon(AppIcons.retry, size: 20),
              onPressed: enabled ? () => controller.retry(a) : null,
            ),
          IconButton(
            tooltip: 'Зураг хасах',
            constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
            icon: const Icon(AppIcons.close, size: 20),
            onPressed: enabled ? () => controller.remove(a) : null,
          ),
        ],
      ),
    );
  }
}
