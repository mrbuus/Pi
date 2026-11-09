import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/files.dart';
import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../support/domain/feedback_form.dart' show uuidV4;
import '../application/content_providers.dart';
import '../data/content_models.dart';
import 'content_widgets.dart';

/// Нэг онолын блок үүсгэх / засах (вэбийн `TheoryBlockEditor`): гарчиг, агуулга (`$...$` томьёо),
/// зураг нэмэх (утасны зургийн сангаас), урьдчилан харах. Хадгалбал `true`-гээр буцна.
class TheoryEditorScreen extends ConsumerStatefulWidget {
  const TheoryEditorScreen({super.key, required this.chapterId, this.block});

  final String chapterId;
  final TheoryItem? block;

  @override
  ConsumerState<TheoryEditorScreen> createState() => _TheoryEditorScreenState();
}

class _TheoryEditorScreenState extends ConsumerState<TheoryEditorScreen> {
  late final _title = TextEditingController(text: widget.block?.title ?? '');
  late final _content = TextEditingController(text: widget.block?.content ?? '');
  late List<String> _images = [...?widget.block?.imageKeys];
  bool _preview = false;
  bool _saving = false;
  bool _uploading = false;
  String? _error;
  ({String fingerprint, String id})? _request;

  bool get _isEdit => widget.block != null;

  bool get _dirty =>
      _title.text != (widget.block?.title ?? '') ||
      _content.text != (widget.block?.content ?? '') ||
      _images.join('|') != (widget.block?.imageKeys ?? const []).join('|') ||
      _uploading;

  @override
  void initState() {
    super.initState();
    _title.addListener(_changed);
    _content.addListener(_changed);
  }

  void _changed() => setState(() => _error = null);

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    super.dispose();
  }

  Future<String?> _askAlt() async {
    final alt = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Зургийн товч тайлбар'),
        content: TextField(
          controller: alt,
          autofocus: true,
          maxLength: 120,
          decoration: const InputDecoration(hintText: 'Жишээ: Гурвалжны өнцгүүд'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text(AppStrings.cancel)),
          FilledButton(onPressed: () => Navigator.of(ctx).pop(true), child: const Text('Нэмэх')),
        ],
      ),
    );
    final text = alt.text.trim();
    alt.dispose();
    return ok == true && text.isNotEmpty ? text : null;
  }

  Future<void> _addImage() async {
    if (_uploading || _saving) return;
    final pages = await ref.read(photoSourceProvider).pickFromGallery(limit: 1);
    if (pages.isEmpty || !mounted) return;
    final alt = await _askAlt();
    if (alt == null || !mounted) {
      if (mounted) contentSnack(context, 'Зургийн тайлбар заавал бичнэ үү');
      return;
    }
    setState(() => _uploading = true);
    try {
      final up = await ref
          .read(fileUploaderProvider)
          .upload(bytes: pages.first.bytes, name: pages.first.name, mime: 'image/jpeg', purpose: UploadPurpose.theory);
      if (!mounted) return;
      setState(() {
        _images = [..._images, up.key];
        _content.text = insertImageMarkdown(_content.text, alt, up.key);
      });
    } catch (e) {
      if (mounted) contentSnack(context, contentError(e, 'Зураг илгээж чадсангүй. Дахин оролдоно уу'));
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  void _removeImage(String key) => setState(() {
    _images = [
      for (final k in _images)
        if (k != key) k,
    ];
    _content.text = removeImageMarkdown(_content.text, key);
  });

  Future<void> _save() async {
    if (_saving || _uploading) return;
    final title = _title.text.trim();
    final content = _content.text;
    if (title.isEmpty) return setState(() => _error = 'Гарчиг оруулна уу');
    if (content.trim().isEmpty) return setState(() => _error = 'Онолын агуулга хоосон байна');
    setState(() {
      _saving = true;
      _error = null;
    });
    final repo = ref.read(contentRepositoryProvider);
    try {
      if (_isEdit) {
        await repo.updateTheory(widget.block!.id, title: title, content: content, imageKeys: _images);
      } else {
        final fp = [widget.chapterId, title, content, ..._images].join('\u0000');
        if (_request?.fingerprint != fp) _request = (fingerprint: fp, id: uuidV4());
        await repo.createTheory(
          widget.chapterId,
          title: title,
          content: content,
          imageKeys: _images,
          requestId: _request!.id,
        );
      }
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() => _error = contentError(e, 'Холболтоо шалгаад дахин оролдоно уу. Бичсэн мэдээлэл хэвээр байна'));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _maybePop() async {
    final leave = await confirmAction(
      context,
      title: 'Хадгалаагүй өөрчлөлт байна',
      message: 'Гарвал өөрчлөлт устана',
      confirmLabel: 'Хаяад гарах',
    );
    if (leave && mounted) Navigator.of(context).pop(false);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return PopScope(
      canPop: !_dirty || _saving,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _maybePop();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(_isEdit ? 'Блок засах' : 'Шинэ онолын блок'),
          actions: [
            TextButton(
              onPressed: _saving || _uploading ? null : _save,
              child: Text(_saving ? 'Хадгалж байна' : AppStrings.save),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
          children: [
            TextField(
              controller: _title,
              maxLength: 200,
              textCapitalization: TextCapitalization.sentences,
              decoration: const InputDecoration(labelText: 'Гарчиг'),
            ),
            const SizedBox(height: AppSpace.sm),
            SegmentedButton<bool>(
              segments: const [
                ButtonSegment(value: false, label: Text('Бичих'), icon: Icon(AppIcons.pencilLine, size: 18)),
                ButtonSegment(value: true, label: Text('Харах'), icon: Icon(AppIcons.show, size: 18)),
              ],
              selected: {_preview},
              onSelectionChanged: (v) => setState(() => _preview = v.first),
            ),
            const SizedBox(height: AppSpace.md),
            if (_preview)
              _Preview(content: _content.text)
            else
              TextField(
                controller: _content,
                minLines: 10,
                maxLines: null,
                maxLength: 50000,
                keyboardType: TextInputType.multiline,
                decoration: const InputDecoration(
                  labelText: 'Агуулга',
                  alignLabelWithHint: true,
                  helperText: r'Томьёог $...$ дотор бичнэ: $a^2+b^2=c^2$',
                ),
              ),
            if (_error != null) ...[
              const SizedBox(height: AppSpace.sm),
              Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
            ],
            const SectionHeader(title: 'Зураг'),
            if (_images.isEmpty)
              Text('Зураг нэмээгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
            else
              Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.sm,
                children: [
                  for (final k in _images)
                    SizedBox(
                      width: 140,
                      child: Stack(
                        children: [
                          FileImageView(k, semanticLabel: 'Онолын зураг'),
                          Positioned(
                            right: 0,
                            top: 0,
                            child: IconButton.filledTonal(
                              tooltip: 'Зураг хасах',
                              icon: const Icon(AppIcons.close, size: 18),
                              onPressed: _saving ? null : () => _removeImage(k),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            const SizedBox(height: AppSpace.md),
            OutlinedButton.icon(
              onPressed: _uploading || _saving ? null : _addImage,
              icon: _uploading
                  ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(AppIcons.imagePlus, size: 18),
              label: Text(_uploading ? 'Илгээж байна' : 'Зураг нэмэх'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Сурагчид харагдах хэлбэр: бичвэр (MathText) ба зургийн мөр.
class _Preview extends StatelessWidget {
  const _Preview({required this.content});

  final String content;

  @override
  Widget build(BuildContext context) {
    final parts = splitTheory(content);
    if (parts.isEmpty) {
      return Text('Урьдчилан харах зүйл алга', style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim));
    }
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final p in parts)
            Padding(
              padding: const EdgeInsets.only(bottom: AppSpace.sm),
              child: p.imageKey != null
                  ? FileImageView(p.imageKey!, fit: BoxFit.contain, semanticLabel: p.alt)
                  : MathText(p.text!),
            ),
        ],
      ),
    );
  }
}
