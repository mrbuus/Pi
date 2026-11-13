import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/files/files.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/account_repository.dart';
import '../data/avatar_image.dart';

/// Профайл зураг солих/нэмэх — вэбийн `ProfilePhoto`: `POST /uploads` (FileUploader) → `POST /auth/me/avatar {key}`.
/// Камер/галерейн зөвшөөрлийг сонголт хийх үед л систем асууна. Алдаа гарвал хуучин зураг хэвээр.
/// Илгээхийн өмнө 512px дөрвөлжин JPEG болгоно (вэб 2026-11-12: HEIC, EXIF эргэлт, том файл).
class AvatarChangeButton extends ConsumerStatefulWidget {
  const AvatarChangeButton({super.key, required this.hasAvatar});

  final bool hasAvatar;

  @override
  ConsumerState<AvatarChangeButton> createState() => _AvatarChangeButtonState();
}

class _AvatarChangeButtonState extends ConsumerState<AvatarChangeButton> {
  bool _busy = false;
  String? _error;

  Future<void> _choose() async {
    final camera = await showModalBottomSheet<bool>(
      context: context,
      showDragHandle: true,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              minTileHeight: AppSizes.minTap,
              leading: const Icon(AppIcons.camera),
              title: const Text('Камераар авах'),
              onTap: () => Navigator.pop(ctx, true),
            ),
            ListTile(
              minTileHeight: AppSizes.minTap,
              leading: const Icon(AppIcons.gallery),
              title: const Text('Галерейгаас сонгох'),
              onTap: () => Navigator.pop(ctx, false),
            ),
          ],
        ),
      ),
    );
    if (camera == null || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final source = ref.read(photoSourceProvider);
      final PhotoPage? page = camera ? await source.takePhoto() : (await source.pickFromGallery(limit: 1)).firstOrNull;
      if (page == null) return;
      final bytes = await ref.read(avatarProcessorProvider).prepare(page.bytes);
      final uploaded = await ref.read(fileUploaderProvider).upload(
            bytes: bytes,
            name: 'avatar.jpg',
            mime: 'image/jpeg',
            purpose: UploadPurpose.general,
          );
      await ref.read(accountRepositoryProvider).setAvatar(uploaded.key);
      try {
        await ref.read(sessionProvider.notifier).refreshUser();
      } catch (_) {
        // Зураг хадгалагдсан; профайлыг дараагийн нээлтэд шинэчилнэ.
      }
    } on UploadCancelled {
      // хэрэглэгч болиулсан
    } catch (e) {
      if (mounted) setState(() => _error = e is ApiError ? e.message : 'Зураг байршуулахад алдаа гарлаа. Дахин оролдоно уу');
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextButton.icon(
          style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap), padding: EdgeInsets.zero),
          onPressed: _busy ? null : _choose,
          icon: _busy
              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(AppIcons.camera, size: 18),
          label: Text(_busy ? 'Байршуулж байна' : (widget.hasAvatar ? 'Зураг солих' : 'Зураг нэмэх')),
        ),
        if (_error != null)
          Semantics(
            liveRegion: true,
            child: Text(_error!, style: context.text.bodySmall?.copyWith(color: context.colors.error)),
          ),
      ],
    );
  }
}
