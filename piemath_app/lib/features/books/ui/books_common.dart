import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/env.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';

/// `books` feature-ийн нэмэлт Lucide дүрс.
abstract final class BooksIcons {
  static const IconData lock = LucideIcons.lock;
  static const IconData play = LucideIcons.play;
  static const IconData free = LucideIcons.sparkles;
  static const IconData send = LucideIcons.send;
  static const IconData again = LucideIcons.rotateCcw;
  static const IconData inClass = LucideIcons.school;
  static const IconData open = LucideIcons.arrowRight;
  static const IconData mock = LucideIcons.clipboardList;
  static const IconData placement = LucideIcons.target;
}

/// Номын нэр — `$\pi$ тест` гэх мэт LaTeX агуулж болох тул MathText-ээр.
class BookName extends StatelessWidget {
  const BookName(this.name, {super.key, this.style, this.maxLines});

  final String name;
  final TextStyle? style;
  final int? maxLines;

  @override
  Widget build(BuildContext context) => name.contains(r'$')
      ? MathText(name, style: style, maxLines: maxLines)
      : Text(name, style: style, maxLines: maxLines, overflow: maxLines == null ? null : TextOverflow.ellipsis);
}

const accessNoteText =
    'Номын бүх тест, зөв хариу, бодолт, видео тайлбарыг эрхтэй сурагчид үзнэ. Эрхээ вэб эсвэл сургалтын төвөөр аваарай.';

/// Эрх нээх тухай мэдээлэл. Апп дотор ХУДАЛДАХГҮЙ (Apple 3.1.1 — In-App Purchase шаардлага):
/// үнэ, худалдах товчгүй, зөвхөн «вэб эсвэл сургалтын төвөөр».
class AccessNoteCard extends StatelessWidget {
  const AccessNoteCard({super.key, this.webPath = '/books'});

  final String webPath;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(BooksIcons.lock, size: 18, color: context.colors.brand),
              const SizedBox(width: AppSpace.sm),
              Expanded(child: Text('Эрх нээх', style: context.text.titleSmall)),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Text(accessNoteText, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
          const SizedBox(height: AppSpace.md),
          OutlinedButton.icon(
            icon: const Icon(AppIcons.forward, size: 18),
            label: const Text('Вэбээр нээх'),
            onPressed: () => openWeb(webPath),
          ),
        ],
      ),
    );
  }
}

/// Доороос гарах мэдээлэл (тестийн мөрийн «Эрх нээх»).
Future<void> showAccessSheet(BuildContext context, {String webPath = '/books'}) => showModalBottomSheet<void>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Эрх нээх', style: ctx.text.titleMedium),
              const SizedBox(height: AppSpace.sm),
              Text(accessNoteText, style: ctx.text.bodyMedium),
              const SizedBox(height: AppSpace.lg),
              OutlinedButton.icon(
                icon: const Icon(AppIcons.forward, size: 18),
                label: const Text('Вэбээр нээх'),
                onPressed: () => openWeb(webPath),
              ),
            ],
          ),
        ),
      ),
    );

/// Вэбийн нийтийн хуудсыг гаднаас нээнэ (зөвхөн апп-ын өөрийн домэйн).
Future<void> openWeb(String path) =>
    launchUrl(Uri.parse('${Env.webBaseUrl}$path'), mode: LaunchMode.externalApplication);

/// Нийтийн хуудсын алдааны төлөв (сүлжээ / 404).
Widget publicError(Object error, {required VoidCallback onRetry}) {
  final e = error is ApiError ? error : null;
  if (e?.kind == ApiErrorKind.notFound) {
    return EmptyState(icon: AppIcons.theory, title: e!.message, message: 'Номын жагсаалт руу буцаж өөр ном сонгоно уу');
  }
  return ErrorState(
    icon: e?.isNetwork ?? false ? AppIcons.offline : AppIcons.error,
    message: e?.message ?? AppStrings.genericError,
    onRetry: onRetry,
  );
}
