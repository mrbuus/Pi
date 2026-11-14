import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/files.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/ui/ui.dart';
import '../data/homework_models.dart';
import '../data/homework_repository.dart';
import '../domain/homework_logic.dart';
import '../domain/photo_rules.dart';
import 'composer/notebook_composer_screen.dart';
import 'homework_providers.dart';
import 'photo_edit_window.dart';

/// Хичээлийн өдрийн дэвтрийн зураг: илгээх, харах, дахин илгээх, устгах (вэбийн `HomeworkPhotoPanel`).
/// 15 хүртэл хуудас; илгээснээс 5 минутын дотор л устгаж, сольно (эзэн 2026-11-12) — багш буцаасан бол
/// хугацаагүйгээр дахин илгээнэ. Сервер `canSend`, хугацааг дахин шалгана. «PDF» гэдэг үг хүүхдэд харагдахгүй.
class HomeworkPhotoPanel extends ConsumerStatefulWidget {
  const HomeworkPhotoPanel({super.key, required this.day, required this.canSend});

  final HwDay day;
  final bool canSend;

  @override
  ConsumerState<HomeworkPhotoPanel> createState() => _HomeworkPhotoPanelState();
}

class _HomeworkPhotoPanelState extends ConsumerState<HomeworkPhotoPanel> {
  bool _deleting = false;

  HwDay get day => widget.day;

  Future<void> _compose() async {
    final ok = await NotebookComposerScreen.open(
      context,
      title: 'Дэвтрийн зураг',
      subtitle: '${dayLabel(day.date)}, $homeworkPhotoMaxPages хүртэл хуудас',
      maxPages: homeworkPhotoMaxPages,
      onSubmit: (pages, _, progress, cancel) async {
        final (file, count) = await uploadPhotoSet(
          ref,
          pages,
          purpose: UploadPurpose.homework,
          maxPages: homeworkPhotoMaxPages,
          fileName: uploadFileName('daalgavar', day.date),
          onProgress: progress,
          cancel: cancel,
        );
        progress(PhotoUploadPhase.saving, 1);
        await ref
            .read(homeworkRepositoryProvider)
            .sendPhoto(classroomId: day.classroomId, date: day.date, fileKey: file.key, pages: count);
      },
    );
    if (ok) {
      ref.invalidate(homeworkDaysProvider);
      if (mounted) _snack('Зураг илгээгдлээ');
    }
  }

  Future<void> _delete(HwPhoto photo) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Зургийг устгах уу?'),
        content: const Text('Устгасны дараа дахин илгээж болно.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Устгах')),
        ],
      ),
    );
    if (yes != true) return;
    setState(() => _deleting = true);
    try {
      await ref.read(homeworkRepositoryProvider).deletePhoto(photo.id);
      ref.invalidate(homeworkDaysProvider);
    } on ApiError catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _deleting = false);
    }
  }

  void _snack(String text) => ScaffoldMessenger.maybeOf(context)?.showSnackBar(SnackBar(content: Text(text)));

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final photo = day.photo;
    final canSend = widget.canSend;

    if (photo != null) {
      return PhotoEditWindow(
        sentAt: photo.uploadedAt,
        builder: (context, inWindow) => _sent(context, photo, canSend: canSend, inWindow: inWindow),
      );
    }

    if (!canSend) {
      return Row(
        children: [
          Icon(AppIcons.time, size: 16, color: c.inkDim),
          const SizedBox(width: AppSpace.sm),
          Text('Илгээх хугацаа дууссан', style: context.text.bodySmall),
        ],
      );
    }
    return SizedBox(
      width: double.infinity,
      child: FilledButton.icon(
        onPressed: _compose,
        icon: const Icon(AppIcons.camera, size: 18),
        label: const Text('Дэвтрийн зураг илгээх'),
      ),
    );
  }

  Widget _sent(BuildContext context, HwPhoto photo, {required bool canSend, required bool inWindow}) {
    final c = context.colors;
    // Дахин илгээх: 5 минутын дотор, эсвэл багш буцаасан үед. Устгах: зөвхөн 5 минутын дотор.
    final canResend = canSend && (inWindow || photo.returned);
    final canDelete = canSend && inWindow;
    return Container(
      padding: const EdgeInsets.all(AppSpace.md),
      decoration: BoxDecoration(
        color: c.surfaceSunken,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: photo.returned ? c.error : c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (photo.returned) ...[
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(AppIcons.undo, size: 18, color: c.error),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Text(
                    'Багш буцаасан — сэтгэгдлийг уншаад засаж, дахин илгээнэ үү',
                    style: context.text.bodyMedium?.copyWith(color: c.error, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
          ],
          Row(
            children: [
              Icon(AppIcons.fileCheck, size: 20, color: c.success),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Зураг илгээсэн, ${photo.pages} хуудас', style: context.text.titleSmall),
                    if (photo.uploadedAt != null)
                      Text(DateMn.relative(photo.uploadedAt!), style: context.text.bodySmall),
                  ],
                ),
              ),
              const InfoHint(
                title: 'Хадгалах хугацаа',
                message: 'Дэвтрийн зураг 7 хоног хадгалагдаад автоматаар устна. Багш энэ хугацаанд шалгана.',
              ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            children: [
              OutlinedButton.icon(
                onPressed: () => FileGalleryScreen.open(
                  context,
                  fileKeys: [photo.fileKey],
                  title: 'Дэвтрийн зураг',
                  subtitle: dayLabel(day.date),
                ),
                icon: const Icon(AppIcons.gallery, size: 18),
                label: const Text('Харах'),
              ),
              if (canResend)
                TextButton.icon(
                  onPressed: _deleting ? null : _compose,
                  icon: const Icon(AppIcons.camera, size: 18),
                  label: const Text('Дахин илгээх'),
                ),
              if (canDelete)
                TextButton.icon(
                  onPressed: _deleting ? null : () => _delete(photo),
                  style: TextButton.styleFrom(foregroundColor: c.error),
                  icon: const Icon(AppIcons.trash, size: 18),
                  label: const Text('Устгах'),
                ),
            ],
          ),
          if (canDelete) ...[
            const SizedBox(height: AppSpace.xs),
            Text(photoEditHint, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          ],
        ],
      ),
    );
  }
}
