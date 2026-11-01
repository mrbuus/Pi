import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/account_repository.dart';
import '../data/native_sign_in.dart';
import 'native_sign_in_section.dart';
import 'widgets/auth_widgets.dart';

final googleLinkStatusProvider =
    FutureProvider.autoDispose<GoogleLinkStatus>((ref) => ref.watch(accountRepositoryProvider).googleStatus());

final appleAvailableProvider =
    FutureProvider.autoDispose<bool>((ref) => ref.watch(nativeSignInProvider).appleAvailable());

String takenText(NativeProvider p) =>
    'Энэ ${p.label} бүртгэл өөр Piemath хэрэглэгчтэй холбогдсон байна. Өөр бүртгэл сонгох эсвэл сургалтын '
    'төвд хандана уу';

/// «Миний мэдээлэл» — Google / Apple холбох, салгах. Аль нь ч боломжгүй бол юу ч зурахгүй.
///
/// Apple-ийн холболтын төлөв, салгах endpoint серверт байхгүй — холбосны дараа энэ удаад л
/// «Холбогдсон» гэж харуулна.
class LinkedAccountsSection extends ConsumerStatefulWidget {
  const LinkedAccountsSection({super.key});

  @override
  ConsumerState<LinkedAccountsSection> createState() => _LinkedAccountsSectionState();
}

class _LinkedAccountsSectionState extends ConsumerState<LinkedAccountsSection> {
  NativeProvider? _busy;
  bool _appleLinked = false;
  String? _message;
  bool _isError = true;

  void _show(String? message, {bool isError = true}) {
    if (!mounted) return;
    setState(() {
      _message = message;
      _isError = isError;
    });
  }

  void _toast(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> _link(NativeProvider p) async {
    if (_busy != null) return;
    setState(() => _busy = p);
    _show(null);
    final native = ref.read(nativeSignInProvider);
    final repo = ref.read(accountRepositoryProvider);
    try {
      final LinkResult result;
      if (p == NativeProvider.google) {
        final idToken = await native.googleIdToken();
        if (idToken == null) return;
        result = await repo.googleLink(idToken);
      } else {
        final c = await native.apple();
        if (c == null) return;
        result = await repo.appleLink(identityToken: c.identityToken, rawNonce: c.rawNonce);
      }
      if (result == LinkResult.taken) {
        _show(takenText(p));
        return;
      }
      if (p == NativeProvider.google) {
        ref.invalidate(googleLinkStatusProvider);
      } else if (mounted) {
        setState(() => _appleLinked = true);
      }
      _toast('${p.label} бүртгэл холбогдлоо. Дараагийн удаа ${p.label}-ээр нэвтэрч болно');
    } on NativeSignInException catch (e) {
      _show(e.message);
    } on ApiError catch (e) {
      _show(e.status == 503 ? '${p.label} холболт одоогоор ашиглах боломжгүй' : e.message);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _unlinkGoogle() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Google бүртгэлийг салгах уу?'),
        content: const Text('Дараа нь Google-ээр нэвтрэх боломжгүй болно. Утас, нууц үгээрээ нэвтэрсээр байна'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Салгах')),
        ],
      ),
    );
    if (!(ok ?? false) || !mounted) return;
    setState(() => _busy = NativeProvider.google);
    _show(null);
    try {
      await ref.read(accountRepositoryProvider).googleUnlink();
      ref.invalidate(googleLinkStatusProvider);
      _toast('Google бүртгэл салгагдлаа');
    } on ApiError catch (e) {
      _show(e.message);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final showGoogle = ref.watch(nativeSignInProvider).googleConfigured;
    final showApple = ref.watch(appleAvailableProvider).value ?? false;
    if (!showGoogle && !showApple) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader(
          title: 'Холбосон бүртгэл',
          trailing: InfoHint(
            title: 'Холбосон бүртгэл гэж юу вэ',
            message: 'Google эсвэл Apple бүртгэлээ холбовол дараагийн удаа нууц үг бичихгүйгээр нэг товшилтоор '
                'нэвтэрнэ. Утас, нууц үгээрээ нэвтрэх боломж хэвээр үлдэнэ',
          ),
        ),
        AppCard(
          padding: const EdgeInsets.all(AppSpace.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (showGoogle) _googleRow(context),
              if (showGoogle && showApple) ...[
                const SizedBox(height: AppSpace.md),
                Divider(color: context.colors.line),
                const SizedBox(height: AppSpace.md),
              ],
              if (showApple) _appleRow(context),
              FormMessage(message: _message, isError: _isError),
            ],
          ),
        ),
      ],
    );
  }

  Widget _googleRow(BuildContext context) {
    final status = ref.watch(googleLinkStatusProvider);
    final busy = _busy == NativeProvider.google;
    return status.when(
      loading: () => const SizedBox(height: AppSizes.minTap, child: Center(child: ButtonProgress())),
      error: (e, _) => Row(
        children: [
          Expanded(
            child: Text(
              'Google холболтын төлөвийг ачаалж чадсангүй',
              style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
            ),
          ),
          TextButton(
            onPressed: () => ref.invalidate(googleLinkStatusProvider),
            child: const Text(AppStrings.retry),
          ),
        ],
      ),
      data: (s) => s.linked
          ? _LinkedRow(
              title: 'Google',
              subtitle: s.email ?? 'Холбогдсон',
              action: OutlinedButton(
                style: OutlinedButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                onPressed: busy || _busy != null ? null : _unlinkGoogle,
                child: busy ? const ButtonProgress() : const Text('Салгах'),
              ),
            )
          : GoogleButton(
              label: 'Google бүртгэл холбох',
              busy: busy,
              onPressed: _busy == null ? () => _link(NativeProvider.google) : null,
            ),
    );
  }

  Widget _appleRow(BuildContext context) {
    if (_appleLinked) return const _LinkedRow(title: 'Apple', subtitle: 'Холбогдсон');
    if (_busy == NativeProvider.apple) {
      return const SizedBox(height: AppSizes.minTap, child: Center(child: ButtonProgress()));
    }
    return AppleSignInButton(
      label: 'Apple ID холбох',
      enabled: _busy == null,
      dark: Theme.of(context).brightness == Brightness.dark,
      onPressed: () => _link(NativeProvider.apple),
    );
  }
}

class _LinkedRow extends StatelessWidget {
  const _LinkedRow({required this.title, required this.subtitle, this.action});

  final String title;
  final String subtitle;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: AppSizes.minTap),
      child: Row(
        children: [
          Icon(AppIcons.success, size: 20, color: context.colors.success),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title, style: context.text.titleSmall),
                Text(subtitle, style: context.text.bodySmall),
              ],
            ),
          ),
          ?action,
        ],
      ),
    );
  }
}
