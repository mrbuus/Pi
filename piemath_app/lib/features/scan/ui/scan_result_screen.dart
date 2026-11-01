import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/files/file_image.dart';
import '../../../core/math/math.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/solution/solution.dart';
import '../data/scan_result.dart';
import '../domain/lock_message.dart';
import '../domain/scan_code.dart';
import 'scan_icons.dart';

/// Номын QR-аар нээсэн бодлого (`/app/scan/:code`, вэбийн `app/scan/[code]`).
///
/// QR ШИНЭ ЭРХ ОЛГОХГҮЙ — сервер юу буцаасныг л харуулна: бодолт нээгдсэн бол бодолт,
/// үгүй бол шалтгааны тайлбар. Гаднаас (камер, deep link) нээгддэг тул «Буцах» = өмнөх эсвэл нүүр.
class ScanResultScreen extends ConsumerWidget {
  const ScanResultScreen({super.key, required this.rawCode});

  /// Маршрутын параметр (нормчлоогүй).
  final String rawCode;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final code = normalizeScanCode(rawCode);
    if (code == null) {
      return _Frame(
        title: 'Бодлого',
        child: EmptyState(
          icon: AppIcons.qr,
          title: 'QR код буруу байна',
          message: 'Номын хуудсан дээрх QR кодыг дахин уншуулна уу',
          action: _ScanAgainButton(),
        ),
      );
    }
    final async = ref.watch(scanResultProvider(code));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const _Frame(title: 'Бодлого', child: LoadingState(cards: 2)),
      error: (e, _) => _Frame(title: 'Бодлого', child: _ScanError(error: e, code: code)),
      data: (data) => _Frame(title: _title(data), child: _ScanBody(data: data)),
    );
  }

  static String _title(ScanResult d) => d.source.number != null ? '${d.source.number}-р бодлого' : 'Бодлого';
}

class _Frame extends StatelessWidget {
  const _Frame({required this.title, required this.child});

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: Text(title)),
      body: child,
    );
  }
}

class _ScanAgainButton extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return FilledButton.icon(
      icon: const Icon(AppIcons.scan, size: 18),
      label: const Text('Дахин уншуулах'),
      onPressed: () => context.go('/app/scan'),
    );
  }
}

class _ScanError extends ConsumerWidget {
  const _ScanError({required this.error, required this.code});

  final Object error;
  final String code;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final e = error is ApiError ? error as ApiError : null;
    if (e?.kind == ApiErrorKind.notFound) {
      // Серверийн монгол мессеж: «QR код буруу байна» / «Энэ QR кодтой бодлого олдсонгүй».
      return EmptyState(
        icon: AppIcons.qr,
        title: e!.message,
        message: 'Номын хуудсан дээрх QR кодыг дахин уншуулна уу',
        action: _ScanAgainButton(),
      );
    }
    return ErrorState(
      icon: e?.isNetwork ?? false ? AppIcons.offline : AppIcons.error,
      message: e?.message ?? AppStrings.genericError,
      onRetry: () => ref.invalidate(scanResultProvider(code)),
    );
  }
}

class _ScanBody extends ConsumerWidget {
  const _ScanBody({required this.data});

  final ScanResult data;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final files = ref.watch(fileImageProvider);
    final c = context.colors;
    final title = ScanResultScreen._title(data);
    final book = data.source.book;
    // «1000 бодлого», «Сорил 16-A» гэсэн бүлгийн нэрт номын нэр давтагддаг — давхар бүү харуул (вэбтэй ижил).
    final bookShown =
        book != null && !data.source.chapter.toLowerCase().startsWith(book.toLowerCase()) ? book : null;
    final lock = data.access == ScanAccess.locked && data.lockReason != null
        ? lockMessage(data.lockReason!, data.opensAt)
        : null;
    final right = data.access == ScanAccess.full ? data.correctLetter : null;

    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        Meta(
          items: [
            bookShown,
            if (data.source.chapter.isNotEmpty) MetaTitle(data.source.chapter, style: context.text.bodySmall),
            if (data.source.page != null) '${data.source.page}-р хуудас',
          ],
        ),
        const SizedBox(height: AppSpace.md),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ProblemFigure(
                image: data.imageKey == null ? null : files.image(data.imageKey!),
                alt: '$title-ын зураг',
                forbiddenTitle: 'Зураг одоохондоо хаалттай',
                forbiddenMessage: 'Зургийг номын хуудаснаас харна уу.',
                child: MathText(data.statementText ?? ''),
              ),
              if (data.hasImage && data.imageKey == null) ...[
                const SizedBox(height: AppSpace.md),
                Row(
                  children: [
                    Icon(ScanIcons.imageHint, size: 16, color: c.inkDim),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(child: Text('Зургийг номын хуудаснаас харна уу.', style: context.text.bodySmall)),
                  ],
                ),
              ],
              if (data.choices.isNotEmpty) ...[
                const SizedBox(height: AppSpace.lg),
                ChoiceGrid(
                  variant: ChoiceGridVariant.compact,
                  showCorrect: right != null,
                  groupLabel: 'Сонголтууд',
                  choices: [
                    for (final ch in data.choices)
                      ChoiceItem(
                        label: ch.letter,
                        text: ch.text,
                        image: ch.image == null ? null : files.image(ch.image!),
                        isCorrect: ch.letter == right,
                      ),
                  ],
                ),
                if (right != null) ...[
                  const SizedBox(height: AppSpace.sm),
                  _AnswerRow(label: 'Зөв хариу', value: right),
                ],
              ],
              if (data.access == ScanAccess.full && !data.isChoice && data.correctAnswer != null) ...[
                const SizedBox(height: AppSpace.md),
                _AnswerRow(label: 'Зөв хариу', value: formatAnswerValue(data.correctAnswer)),
              ],
              if (data.answerNeedsCheck) ...[
                const SizedBox(height: AppSpace.md),
                Row(
                  children: [
                    Icon(AppIcons.warning, size: 16, color: c.warning),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Text(
                        'Хариуны түлхүүрийг багш нар дахин шалгаж байна.',
                        style: context.text.bodySmall?.copyWith(color: c.warning),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        if (lock != null) ...[
          const SizedBox(height: AppSpace.md),
          AppCard(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(ScanIcons.lock, size: 20, color: c.brand),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(lock.title, style: context.text.titleSmall),
                      const SizedBox(height: AppSpace.xs),
                      Text(lock.body, style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
        if (data.solution != null && data.solution!.trim().isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          Semantics(
            label: 'Бодолт',
            container: true,
            child: AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  SolutionView(source: data.solution),
                ],
              ),
            ),
          ),
        ],
        if (data.youtube != null && isAllowedYoutubeUrl(data.youtube!.url)) ...[
          const SizedBox(height: AppSpace.md),
          OutlinedButton.icon(
            icon: const Icon(ScanIcons.video, size: 18),
            label: const Text('Бодолтын видео үзэх'),
            onPressed: () => launchUrl(Uri.parse(data.youtube!.url), mode: LaunchMode.externalApplication),
          ),
        ],
      ],
    );
  }
}

class _AnswerRow extends StatelessWidget {
  const _AnswerRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      children: [
        Icon(AppIcons.success, size: 18, color: c.success),
        const SizedBox(width: AppSpace.sm),
        Text('$label: ', style: context.text.titleSmall),
        Flexible(child: MathText(value, style: context.text.bodyMedium?.copyWith(color: c.success))),
      ],
    );
  }
}

/// Нөхөх/нээлттэй бодлогын хариуны түлхүүрийг уншигдахуйц болгоно:
/// мөр/тоо шууд, объект `{a: 3, bc: 54}` → «a = 3, bc = 54».
String formatAnswerValue(Object? v) {
  if (v == null) return '';
  if (v is Map) return v.entries.map((e) => '${e.key} = ${e.value}').join(', ');
  if (v is List) return v.join(', ');
  return v.toString();
}

/// Зөвхөн YouTube-ийн хаягийг гаднаас нээнэ (дур мэдэн хаяг нээхгүй — SECURITY §5).
bool isAllowedYoutubeUrl(String url) {
  final u = Uri.tryParse(url);
  if (u == null || u.scheme != 'https') return false;
  const hosts = {'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'};
  return hosts.contains(u.host.toLowerCase());
}
