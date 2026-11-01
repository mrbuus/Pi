import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:sign_in_with_apple/sign_in_with_apple.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/account_repository.dart';
import '../data/native_sign_in.dart';
import 'widgets/auth_widgets.dart';

enum NativeProvider {
  google('Google'),
  apple('Apple');

  const NativeProvider(this.label);

  final String label;
}

/// Сервер дээр тохируулаагүй (503) үеийн бичвэр — товчийг нууна.
String nativeUnavailableText(NativeProvider p) =>
    '${p.label}-ээр нэвтрэх одоогоор ашиглах боломжгүй. Утасны дугаар, нууц үгээрээ нэвтэрнэ үү';

String notLinkedText(NativeProvider p) =>
    'Энэ ${p.label} бүртгэл таны Piemath бүртгэлтэй холбогдоогүй байна. Эхлээд утасны дугаар, нууц '
    'үгээрээ нэвтэрч, «Миний мэдээлэл» хэсгээс ${p.label}-ээ холбоно уу. Дараа нь нэг товшилтоор нэвтэрнэ';

const googleSignupText = 'Энэ Gmail хаягаар Piemath-д бүртгэл олдсонгүй. Сургалтын төвд бүртгүүлсэн бол '
    'утасны дугаар, нууц үгээрээ нэвтэрнэ үү. Шинэ хэрэглэгч бол доорх «Бүртгүүлэх»-ийг дарна уу';

/// Нэвтрэх дэлгэцийн «Google-ээр / Apple-ээр нэвтрэх» хэсэг. Аль нь ч боломжгүй бол юу ч зурахгүй.
///
/// Apple товч нь албан ёсны `SignInWithAppleButton` (Apple-ийн лого, HIG-ийн дагуу). Google товч нь
/// брэндийн логотой хөрөнгө багцлаагүй тул энгийн бичвэртэй товч.
class NativeSignInSection extends ConsumerStatefulWidget {
  const NativeSignInSection({super.key, required this.remember, this.enabled = true});

  /// «Намайг сана» — серверийн токены хугацаа.
  final bool remember;
  final bool enabled;

  @override
  ConsumerState<NativeSignInSection> createState() => _NativeSignInSectionState();
}

class _NativeSignInSectionState extends ConsumerState<NativeSignInSection> {
  bool _appleAvailable = false;
  final _hidden = <NativeProvider>{};
  NativeProvider? _busy;
  String? _message;
  bool _isError = true;

  @override
  void initState() {
    super.initState();
    ref.read(nativeSignInProvider).appleAvailable().then((v) {
      if (mounted && v) setState(() => _appleAvailable = true);
    });
  }

  Future<void> _run(NativeProvider p) async {
    if (_busy != null) return;
    setState(() {
      _busy = p;
      _message = null;
    });
    final native = ref.read(nativeSignInProvider);
    final repo = ref.read(accountRepositoryProvider);
    try {
      final NativeLoginResult result;
      if (p == NativeProvider.google) {
        final idToken = await native.googleIdToken();
        if (idToken == null) return;
        result = await repo.googleLogin(idToken: idToken, remember: widget.remember);
      } else {
        final c = await native.apple();
        if (c == null) return;
        result = await repo.appleLogin(identityToken: c.identityToken, rawNonce: c.rawNonce, remember: widget.remember);
      }
      switch (result) {
        case NativeLoginOk(:final token):
          await ref.read(sessionProvider.notifier).signIn(
                token: token.accessToken,
                userId: token.userId,
                role: token.role,
                remember: widget.remember,
              );
        // Router redirect энэ дэлгэцийг солино.
        case NativeLoginSignup():
          _show(googleSignupText, isError: false);
        case NativeLoginNotLinked():
          _show(notLinkedText(p), isError: false);
      }
    } on NativeSignInException catch (e) {
      _show(e.message);
    } on ApiError catch (e) {
      if (e.status == 503) {
        if (mounted) setState(() => _hidden.add(p));
        _show(nativeUnavailableText(p), isError: false);
      } else {
        _show(e.message);
      }
    } on FormatException {
      _show(AppStrings.serverError);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  void _show(String message, {bool isError = true}) {
    if (!mounted) return;
    setState(() {
      _message = message;
      _isError = isError;
    });
  }

  @override
  Widget build(BuildContext context) {
    final native = ref.watch(nativeSignInProvider);
    final showGoogle = native.googleConfigured && !_hidden.contains(NativeProvider.google);
    final showApple = _appleAvailable && !_hidden.contains(NativeProvider.apple);
    if (!showGoogle && !showApple && _message == null) return const SizedBox.shrink();
    final enabled = widget.enabled && _busy == null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(child: Divider(color: context.colors.line)),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
              child: Text('эсвэл', style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
            ),
            Expanded(child: Divider(color: context.colors.line)),
          ],
        ),
        const SizedBox(height: AppSpace.lg),
        if (showApple) ...[
          _AppleButton(
            busy: _busy == NativeProvider.apple,
            enabled: enabled,
            label: 'Apple-ээр нэвтрэх',
            onPressed: () => _run(NativeProvider.apple),
          ),
          const SizedBox(height: AppSpace.md),
        ],
        if (showGoogle) ...[
          GoogleButton(
            busy: _busy == NativeProvider.google,
            label: 'Google-ээр нэвтрэх',
            onPressed: enabled ? () => _run(NativeProvider.google) : null,
          ),
          const SizedBox(height: AppSpace.md),
        ],
        FormMessage(message: _message, isError: _isError),
      ],
    );
  }
}

/// Google — энгийн хүрээтэй товч (брэндийн лого багцлаагүй).
class GoogleButton extends StatelessWidget {
  const GoogleButton({super.key, required this.label, required this.onPressed, this.busy = false});

  final String label;
  final VoidCallback? onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
      onPressed: busy ? null : onPressed,
      child: busy ? Semantics(label: 'Google-ээр холбогдож байна', child: const ButtonProgress()) : Text(label),
    );
  }
}

/// Apple-ийн албан ёсны товч (харанхуй горимд цагаан).
class _AppleButton extends StatelessWidget {
  const _AppleButton({required this.busy, required this.enabled, required this.label, required this.onPressed});

  final bool busy;
  final bool enabled;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    if (busy) {
      return OutlinedButton(
        style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
        onPressed: null,
        child: Semantics(label: 'Apple-ээр холбогдож байна', child: const ButtonProgress()),
      );
    }
    final dark = Theme.of(context).brightness == Brightness.dark;
    return AppleSignInButton(label: label, enabled: enabled, onPressed: onPressed, dark: dark);
  }
}

/// `SignInWithAppleButton`-ийг идэвхгүй төлөвтэй болгосон бүрхүүл (профайлд ч хэрэглэнэ).
class AppleSignInButton extends StatelessWidget {
  const AppleSignInButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.enabled = true,
    this.dark = false,
  });

  final String label;
  final VoidCallback onPressed;
  final bool enabled;
  final bool dark;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      excludeSemantics: true,
      child: Opacity(
        opacity: enabled ? 1 : 0.5,
        child: AbsorbPointer(
          absorbing: !enabled,
          child: SignInWithAppleButton(
            text: label,
            height: AppSizes.minTap,
            style: dark ? SignInWithAppleButtonStyle.white : SignInWithAppleButtonStyle.black,
            borderRadius: BorderRadius.circular(AppRadius.md),
            onPressed: onPressed,
          ),
        ),
      ),
    );
  }
}
