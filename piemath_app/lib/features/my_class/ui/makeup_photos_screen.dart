import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/files.dart';
import '../../../core/ui/ui.dart';
import '../../homework/ui/composer/notebook_composer_screen.dart';
import '../data/hub_models.dart';
import '../data/my_class_repository.dart';
import '../domain/hub_logic.dart';
import 'common.dart';
import 'photo_viewer.dart';

/// `/app/makeup/photos/:classroomId/:date` — нөхөх хичээлийн онолын тэмдэглэлийн зураг илгээх.
/// Дэвтрийн хуудсыг авч, тайрч, нэг багц болгон байршуулаад `POST /makeup/me/:c/:d/photos` (багцыг бүтнээр нь солино).
class MakeupPhotosScreen extends ConsumerStatefulWidget {
  const MakeupPhotosScreen({super.key, required this.classroomId, required this.date});

  final String classroomId;
  final String date;

  @override
  ConsumerState<MakeupPhotosScreen> createState() => _MakeupPhotosScreenState();
}

class _MakeupPhotosScreenState extends ConsumerState<MakeupPhotosScreen> {
  bool _sent = false;
  bool _opening = false;

  Future<void> _compose(MakeupItem item) async {
    if (_opening) return;
    _opening = true;
    final ok = await NotebookComposerScreen.open(
      context,
      title: 'Дэвтрийн зураг',
      subtitle: '${dayTitle(item.date)}, ${PhotoDocumentLimits.makeupMaxPages} хүртэл хуудас',
      maxPages: PhotoDocumentLimits.makeupMaxPages,
      usagePath: '/app/makeup',
      onSubmit: (pages, _, progress, cancel) async {
        final (file, _) = await uploadPhotoSet(
          ref,
          pages,
          purpose: UploadPurpose.general,
          maxPages: PhotoDocumentLimits.makeupMaxPages,
          fileName: uploadFileName('nohoh', item.date),
          onProgress: progress,
          cancel: cancel,
        );
        progress(PhotoUploadPhase.saving, 1);
        await ref
            .read(myClassRepositoryProvider)
            .sendMakeupPhotos(classroomId: item.classroomId, date: item.date, imageKeys: [file.key]);
      },
    );
    _opening = false;
    if (!mounted) return;
    if (ok) {
      ref.invalidate(myMakeupProvider);
      setState(() => _sent = true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = ref.watch(myMakeupProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Дэвтрийн зураг')),
      body: AsyncBody(
        value: items,
        onRetry: () => ref.invalidate(myMakeupProvider),
        builder: (list) {
          final item = list
              .where((i) => i.classroomId == widget.classroomId && i.date == widget.date)
              .cast<MakeupItem?>()
              .firstWhere((_) => true, orElse: () => null);
          if (item == null) {
            return const EmptyState(
              icon: AppIcons.success,
              title: 'Энэ өдрийн нөхөх хичээл олдсонгүй',
              message: 'Багш шийдвэрлэсэн эсвэл нөхөх шаардлагагүй болсон байж магадгүй',
            );
          }
          final c = context.colors;
          final closed = !item.isOpen;
          return ListView(
            padding: const EdgeInsets.all(AppSpace.gutter),
            children: [
              Text('${dayTitle(item.date)} хичээлээ нөхөх', style: context.text.titleMedium),
              const SizedBox(height: 2),
              Text(item.classroomName, style: context.text.bodySmall),
              const SizedBox(height: AppSpace.lg),
              if (_sent)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.md),
                  child: Semantics(
                    liveRegion: true,
                    child: Row(
                      children: [
                        Icon(AppIcons.success, size: 18, color: c.success),
                        const SizedBox(width: AppSpace.sm),
                        Expanded(child: Text('Зураг илгээгдлээ', style: context.text.titleSmall)),
                      ],
                    ),
                  ),
                ),
              if (item.resubmit)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.md),
                  child: Row(
                    children: [
                      Icon(AppIcons.restart, size: 16, color: c.warning),
                      const SizedBox(width: AppSpace.xs),
                      Expanded(child: Text('Багш зургаа дахин илгээхийг хүссэн', style: context.text.bodyMedium)),
                    ],
                  ),
                ),
              if (item.imageKeys.isNotEmpty) ...[
                Text('Илгээсэн ${item.photos} хуудас', style: context.text.titleSmall),
                const SizedBox(height: AppSpace.sm),
                PhotoStrip(keys: item.imageKeys, height: 120, semanticPrefix: 'Тэмдэглэлийн зураг'),
              ] else
                Text('Зураг хараахан илгээгээгүй', style: context.text.bodyMedium),
              const SizedBox(height: AppSpace.lg),
              FilledButton.icon(
                onPressed: closed ? null : () => _compose(item),
                icon: const Icon(AppIcons.camera, size: 18),
                label: Text(item.imageKeys.isEmpty ? 'Дэвтрийн зураг илгээх' : 'Зургаа солих'),
              ),
              if (closed)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpace.sm),
                  child: Text('Энэ нөхөх хичээл хаагдсан', style: context.text.bodySmall),
                ),
              if (item.imageKeys.isNotEmpty && !closed)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpace.sm),
                  child: Text(
                    'Шинэ зураг илгээвэл өмнөх зургийг орлоно',
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}
