import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../network/api_error.dart';
import '../../ui/ui.dart';
import '../document_renderer.dart';
import '../file_fetcher.dart';
import '../file_image.dart';

/// Нэг хуудас: зураг эсвэл баримтын хуудас.
sealed class _GalleryPage {
  const _GalleryPage();
}

class _ImagePage extends _GalleryPage {
  const _ImagePage(this.key);
  final String key;
}

class _RenderedPage extends _GalleryPage {
  const _RenderedPage(this.bytes);
  final Uint8List bytes;
}

/// Файлуудыг (зураг ба олон хуудастай баримт) бүтэн дэлгэцээр, хуудас хуудсаар, чимхэж томруулж харах.
/// «Томруулах» гэх мэт илүүц шошгогүй (RULES §4).
class FileGalleryScreen extends ConsumerStatefulWidget {
  const FileGalleryScreen({super.key, required this.fileKeys, required this.title, this.subtitle});

  final List<String> fileKeys;
  final String title;
  final String? subtitle;

  static Future<void> open(
    BuildContext context, {
    required List<String> fileKeys,
    required String title,
    String? subtitle,
  }) {
    return Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => FileGalleryScreen(fileKeys: fileKeys, title: title, subtitle: subtitle),
      ),
    );
  }

  @override
  ConsumerState<FileGalleryScreen> createState() => _FileGalleryScreenState();
}

class _FileGalleryScreenState extends ConsumerState<FileGalleryScreen> {
  late Future<List<_GalleryPage>> _pages = _load();
  int _index = 0;

  Future<List<_GalleryPage>> _load() async {
    final repo = ref.read(fileRepositoryProvider);
    final renderer = ref.read(documentRendererProvider);
    final width = (MediaQuery.sizeOf(context).width * MediaQuery.devicePixelRatioOf(context)).round().clamp(600, 1600);
    final out = <_GalleryPage>[];
    for (final key in widget.fileKeys) {
      if (isDocumentKey(key)) {
        final bytes = await repo.bytes(key);
        for (final page in await renderer.renderPages(bytes, width: width)) {
          out.add(_RenderedPage(page));
        }
      } else {
        out.add(_ImagePage(key));
      }
    }
    return out;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.title),
            if (widget.subtitle != null) Text(widget.subtitle!, style: context.text.bodySmall),
          ],
        ),
      ),
      body: FutureBuilder<List<_GalleryPage>>(
        future: _pages,
        builder: (context, snap) {
          if (snap.hasError) {
            final e = snap.error;
            final notFound = e is ApiError && e.kind == ApiErrorKind.notFound;
            final forbidden = e is ApiError && e.kind == ApiErrorKind.forbidden;
            return ErrorState(
              title: notFound ? 'Хадгалах хугацаа дууссан' : 'Нээж чадсангүй',
              message: notFound
                  ? 'Энэ зураг 7 хоног хадгалагдаад устсан байна'
                  : forbidden
                  ? 'Энэ зургийг харах эрх танд алга'
                  : e is ApiError
                  ? e.message
                  : AppStrings.genericError,
              onRetry: notFound || forbidden ? null : () => setState(() => _pages = _load()),
            );
          }
          if (!snap.hasData) return const LoadingState(cards: 1);
          final pages = snap.data!;
          if (pages.isEmpty) return const EmptyState(title: 'Хуудас алга');
          return Column(
            children: [
              Expanded(
                child: PageView.builder(
                  itemCount: pages.length,
                  onPageChanged: (i) => setState(() => _index = i),
                  itemBuilder: (context, i) => _PageView(page: pages[i]),
                ),
              ),
              if (pages.length > 1)
                Padding(
                  padding: const EdgeInsets.all(AppSpace.md),
                  child: Text(
                    '${_index + 1} / ${pages.length}',
                    style: context.text.labelMedium,
                    semanticsLabel: '${pages.length} хуудасны ${_index + 1}-р хуудас',
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _PageView extends ConsumerWidget {
  const _PageView({required this.page});

  final _GalleryPage page;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final px = (MediaQuery.sizeOf(context).width * MediaQuery.devicePixelRatioOf(context)).round();
    final ImageProvider provider = switch (page) {
      _ImagePage(:final key) => ResizeImage(
        ref.watch(fileImageProvider).image(key),
        width: px,
        policy: ResizeImagePolicy.fit,
        allowUpscaling: false,
      ),
      _RenderedPage(:final bytes) => MemoryImage(bytes),
    };
    return InteractiveViewer(
      maxScale: 5,
      child: Center(
        child: Image(
          image: provider,
          fit: BoxFit.contain,
          gaplessPlayback: true,
          loadingBuilder: (context, child, progress) =>
              progress == null ? child : const Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
          errorBuilder: (context, error, _) =>
              const EmptyState(icon: AppIcons.error, title: 'Зургийг нээж чадсангүй', message: AppStrings.networkError),
        ),
      ),
    );
  }
}
