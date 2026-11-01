import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/file_image.dart';
import '../../../core/ui/ui.dart';

/// Файлын түлхүүр баримт (PDF) эсэх — апп-д хуудсыг нь харуулахгүй, «хуудас» гэж тэмдэглэнэ.
/// («PDF» гэдэг үгийг хүүхдэд харуулахгүй — PLAN M3.3.)
bool isDocumentKey(String key) => key.toLowerCase().endsWith('.pdf');

/// Онолын/тэмдэглэлийн зургийн жижиг хуудаснууд (хэвтээ гүйлгэх). Дарахад бүтэн дэлгэцээр.
class PhotoStrip extends ConsumerWidget {
  const PhotoStrip({super.key, required this.keys, this.height = 120, this.semanticPrefix = 'Зураг'});

  final List<String> keys;
  final double height;
  final String semanticPrefix;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final images = ref.watch(fileImageProvider);
    final c = context.colors;
    final dpr = MediaQuery.devicePixelRatioOf(context);
    return SizedBox(
      height: height,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: keys.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
        itemBuilder: (context, i) {
          final key = keys[i];
          final w = height * 0.75;
          final label = '$semanticPrefix ${i + 1}';
          if (isDocumentKey(key)) {
            return Semantics(
              label: '$label, хуудас',
              child: Container(
                width: w,
                decoration: BoxDecoration(
                  border: Border.all(color: c.line),
                  borderRadius: BorderRadius.circular(AppRadius.md),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(AppIcons.document, color: c.inkDim),
                    const SizedBox(height: AppSpace.xs),
                    Text('Хуудас', style: context.text.bodySmall),
                  ],
                ),
              ),
            );
          }
          return Semantics(
            button: true,
            label: label,
            child: InkWell(
              borderRadius: BorderRadius.circular(AppRadius.md),
              onTap: () => Navigator.of(context, rootNavigator: true).push(
                MaterialPageRoute<void>(
                  fullscreenDialog: true,
                  builder: (_) => PhotoPagesScreen(
                    images: [for (final k in keys.where((k) => !isDocumentKey(k))) images.image(k)],
                    initialIndex: keys.where((k) => !isDocumentKey(k)).toList().indexOf(key),
                  ),
                ),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(AppRadius.md),
                child: Container(
                  width: w,
                  color: c.skeleton,
                  child: Image(
                    image: ResizeImage(images.image(key), width: (w * dpr).round(), policy: ResizeImagePolicy.fit),
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => Center(child: Icon(AppIcons.gallery, color: c.inkDim)),
                  ),
                ),
              ),
            ),
          );
        },
      ),
    );
  }
}

/// Бүтэн дэлгэцийн зураг харагч — хуудас солих, чимхэж томруулах. Илүүц шошгогүй.
class PhotoPagesScreen extends StatefulWidget {
  const PhotoPagesScreen({super.key, required this.images, this.initialIndex = 0});

  final List<ImageProvider> images;
  final int initialIndex;

  @override
  State<PhotoPagesScreen> createState() => _PhotoPagesScreenState();
}

class _PhotoPagesScreenState extends State<PhotoPagesScreen> {
  late final _controller = PageController(initialPage: widget.initialIndex.clamp(0, widget.images.length - 1));
  late int _index = widget.initialIndex.clamp(0, widget.images.length - 1);

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dpr = MediaQuery.devicePixelRatioOf(context);
    final width = (MediaQuery.sizeOf(context).width * dpr).round().clamp(1, 2048);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          tooltip: AppStrings.close,
          icon: const Icon(AppIcons.close),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: Text('${_index + 1} / ${widget.images.length}'),
      ),
      body: PageView.builder(
        controller: _controller,
        itemCount: widget.images.length,
        onPageChanged: (i) => setState(() => _index = i),
        itemBuilder: (context, i) => InteractiveViewer(
          maxScale: 5,
          child: Center(
            child: Image(
              image: ResizeImage(widget.images[i], width: width, policy: ResizeImagePolicy.fit),
              fit: BoxFit.contain,
              loadingBuilder: (context, child, progress) =>
                  progress == null ? child : const Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
              errorBuilder: (_, _, _) => const EmptyState(
                icon: AppIcons.gallery,
                title: 'Зургийг нээж чадсангүй',
                message: 'Интернэт холболтоо шалгаад дахин оролдоно уу',
              ),
            ),
          ),
        ),
      ),
    );
  }
}
