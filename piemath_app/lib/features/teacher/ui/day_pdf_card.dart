import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/files/files.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_today.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

/// Өдрийн тестүүдийн «Эх PDF» (бүх багш; гараар шивсэн эх, A ба B хамт). Файлгүй бол карт харагдахгүй.
/// Нээх: `/files/:key` — Authorization толгойтой, токен URL-д орохгүй (`core/files`).
class DayPdfCard extends ConsumerWidget {
  const DayPdfCard({super.key, required this.classId, required this.date});

  final String classId;
  final String date;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final args = (classId: classId, date: date);
    final async = ref.watch(dayTestPdfsProvider(args));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const SizedBox.shrink(),
      error: (e, _) => AppCard(
        child: Row(
          children: [
            Expanded(child: Text(errorText(e, 'Эх PDF нээгдсэнгүй'), style: context.text.bodyMedium)),
            TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
              onPressed: () => ref.invalidate(dayTestPdfsProvider(args)),
              child: const Text(AppStrings.retry),
            ),
          ],
        ),
      ),
      data: (list) {
        if (list.isEmpty) return const SizedBox.shrink();
        return AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.lg, AppSpace.xs),
                child: Text('Эх PDF', style: context.text.titleSmall),
              ),
              for (final (i, t) in list.indexed) ...[
                if (i > 0) Divider(height: 1, color: context.colors.line),
                _PdfRow(test: t),
              ],
            ],
          ),
        );
      },
    );
  }
}

class _PdfRow extends StatelessWidget {
  const _PdfRow({required this.test});

  final DayTestPdf test;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListTile(
      minTileHeight: teacherTap,
      leading: Icon(TeacherIcons.fileDown, color: c.brand),
      title: Text(test.title),
      subtitle: test.previous ? const Text('Өмнөх хичээл') : null,
      trailing: Icon(AppIcons.forward, color: c.inkDim),
      onTap: () => FileGalleryScreen.open(context, fileKeys: [test.pdfKey], title: test.title, subtitle: 'Эх PDF'),
    );
  }
}
