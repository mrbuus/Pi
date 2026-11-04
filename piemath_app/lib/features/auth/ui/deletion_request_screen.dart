import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/account_repository.dart';
import 'widgets/auth_widgets.dart';

/// `GET /me/deletion-request` — хамгийн сүүлийн хүсэлт (байхгүй бол null).
final deletionRequestProvider =
    FutureProvider.autoDispose<DeletionRequest?>((ref) => ref.watch(accountRepositoryProvider).deletionRequest());

const deletionReceivedText = 'Хүсэлт хүлээн авлаа, сургалтын төв тантай холбогдоно';

/// «Бүртгэл устгах хүсэлт» (App Store 5.1.1(v)). Апп өөрөө юу ч устгахгүй — хүсэлтийг админ шалгана,
/// өгөгдлийг нууцлалын бодлогын дагуу хадгална (прод өгөгдлийн дүрэм).
class DeletionRequestScreen extends ConsumerWidget {
  const DeletionRequestScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(deletionRequestProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Бүртгэл устгах хүсэлт')),
      body: async.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => ErrorState(
          message: e is ApiError ? e.message : AppStrings.genericError,
          onRetry: () => ref.invalidate(deletionRequestProvider),
        ),
        data: (request) => _Body(request: request),
      ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.request});

  final DeletionRequest? request;

  @override
  Widget build(BuildContext context) {
    final r = request;
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: AppSizes.readableWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const _Explanation(),
                if (r != null) ...[
                  const SectionHeader(title: 'Таны хүсэлт'),
                  _StatusCard(request: r),
                ],
                if (r == null || !r.status.isOpen) ...[
                  const SectionHeader(title: 'Хүсэлт илгээх'),
                  const AppCard(child: _RequestForm()),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _Explanation extends StatelessWidget {
  const _Explanation();

  @override
  Widget build(BuildContext context) {
    Widget point(IconData icon, String text) => Padding(
          padding: const EdgeInsets.only(top: AppSpace.md),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 20, color: context.colors.brand),
              const SizedBox(width: AppSpace.md),
              Expanded(child: Text(text, style: context.text.bodyMedium)),
            ],
          ),
        );

    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Хүсэлт хэрхэн шийдвэрлэгдэх вэ', style: context.text.titleMedium),
          point(
            AppIcons.shield,
            'Бүртгэл шууд устахгүй. Сургалтын төвийн админ хүсэлтийг шалгаж, тантай утсаар холбогдоно',
          ),
          point(
            AppIcons.document,
            'Төлбөр, ирц, шалгалтын дүн зэрэг мэдээллийг хууль болон нууцлалын бодлогын дагуу тодорхой '
            'хугацаанд хадгална',
          ),
          point(
            AppIcons.time,
            'Шийдвэрлэгдэх хүртэл аппыг хэвийн ашиглаж болно. Санаа өөрчлөгдвөл төвд мэдэгдэхэд хангалттай',
          ),
          const SizedBox(height: AppSpace.sm),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
              icon: const Icon(AppIcons.forward, size: 18),
              label: const Text('Нууцлалын бодлого'),
              onPressed: () => launchUrl(Uri.parse('${Env.webBaseUrl}/privacy'), mode: LaunchMode.externalApplication),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatusCard extends StatelessWidget {
  const _StatusCard({required this.request});

  final DeletionRequest request;

  @override
  Widget build(BuildContext context) {
    final r = request;
    final (icon, color) = switch (r.status) {
      DeletionStatus.pending || DeletionStatus.inReview => (AppIcons.time, context.colors.info),
      DeletionStatus.resolved => (AppIcons.success, context.colors.success),
      DeletionStatus.rejected => (AppIcons.failure, context.colors.error),
    };
    final created = r.createdAt;
    final note = r.reviewNote?.trim() ?? '';
    final reason = r.reason?.trim() ?? '';
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: color),
              const SizedBox(width: AppSpace.md),
              Expanded(child: Text(r.status.labelMn, style: context.text.titleMedium)),
              if (created != null)
                Text(DateMn.numeric(UbDateTime.fromInstant(created)), style: context.text.bodySmall),
            ],
          ),
          if (r.status.isOpen) ...[
            const SizedBox(height: AppSpace.sm),
            Text(deletionReceivedText, style: context.text.bodyMedium),
          ],
          if (reason.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            Text('Таны бичсэн шалтгаан', style: context.text.bodySmall),
            Text(reason, style: context.text.bodyMedium),
          ],
          if (note.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            Text('Сургалтын төвийн хариу', style: context.text.bodySmall),
            Text(note, style: context.text.bodyMedium),
          ],
        ],
      ),
    );
  }
}

class _RequestForm extends ConsumerStatefulWidget {
  const _RequestForm();

  @override
  ConsumerState<_RequestForm> createState() => _RequestFormState();
}

class _RequestFormState extends ConsumerState<_RequestForm> {
  final _reason = TextEditingController();
  bool _sending = false;
  String? _error;

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_sending) return;
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Бүртгэл устгах хүсэлт илгээх үү?'),
        content: const Text('Сургалтын төвийн админ шалгаад тантай холбогдоно. Бүртгэл шууд устахгүй'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Илгээх')),
        ],
      ),
    );
    if (!(ok ?? false) || !mounted) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref.read(accountRepositoryProvider).submitDeletionRequest(_reason.text);
      if (!mounted) return;
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(const SnackBar(content: Text(deletionReceivedText)));
      ref.invalidate(deletionRequestProvider);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Шалтгаан (заавал биш)', style: context.text.labelLarge),
        const SizedBox(height: AppSpace.xs),
        TextField(
          controller: _reason,
          enabled: !_sending,
          maxLength: 1000,
          minLines: 3,
          maxLines: 6,
          textInputAction: TextInputAction.newline,
          decoration: const InputDecoration(hintText: 'Яагаад устгуулах гэж байгаагаа бичиж болно'),
        ),
        const SizedBox(height: AppSpace.sm),
        FormMessage(message: _error),
        const SizedBox(height: AppSpace.md),
        FilledButton(
          style: FilledButton.styleFrom(backgroundColor: context.colors.error, foregroundColor: context.colors.onStatus),
          onPressed: _sending ? null : _submit,
          child: _sending
              ? Semantics(label: 'Илгээж байна', child: const ButtonProgress())
              : const Text('Хүсэлт илгээх'),
        ),
      ],
    );
  }
}
