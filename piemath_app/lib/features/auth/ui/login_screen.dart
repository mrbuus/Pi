import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../push/push_service.dart';
import '../data/auth_repository.dart';
import '../data/login_prefs.dart';
import 'hero/login_hero.dart';
import 'native_sign_in_section.dart';
import 'widgets/auth_widgets.dart';

/// Нэвтрэх хуудасны админы зарлал (`GET /auth/login-text`). Алдаа, хоосон бол юу ч харуулахгүй —
/// нэвтрэлтэд саад болохгүй.
final loginTextProvider = FutureProvider.autoDispose<String>((ref) async {
  try {
    return await ref.watch(authRepositoryProvider).loginText();
  } catch (_) {
    return '';
  }
});

/// Хэдэн удаа буруу оролдсоны дараа сэргээх замыг тод болгох вэ (вэбийн `HELP_AFTER_ATTEMPTS`).
const helpAfterAttempts = 2;

/// Нэвтрэх — утас / имэйл / нэвтрэх нэр нэг талбараар (вэбийн `app/login/page.tsx`).
///
/// Амжилттай бол [SessionController.signIn] — router өөрөө `?next=` эсвэл role-ийн нүүр рүү шилжүүлнэ.
class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key, this.next, this.message});

  /// Нэвтэрсний дараа очих зам (router `safeNext`-ээр шүүсэн; redirect өөрөө ашиглана).
  final String? next;

  /// Яагаад нэвтрэх рүү ирсэн (жишээ: нууц үг солигдсон).
  final String? message;

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _identifier = TextEditingController();
  final _password = TextEditingController();
  final _identifierFocus = FocusNode();
  final _passwordFocus = FocusNode();

  bool _obscure = true;
  bool _remember = true;
  bool _loading = false;
  int _failCount = 0;
  String? _identifierError;
  String? _passwordError;
  String? _authError;
  String? _info;

  @override
  void initState() {
    super.initState();
    final s = ref.read(sessionProvider);
    _info = widget.message ?? (s is SignedOut ? s.message : null);
    // Нэвтэрмэгц push токен бүртгэнэ (bootstrap уншаагүй байсан ч).
    ref.read(pushSyncProvider);
    _loadPrefs();
  }

  Future<void> _loadPrefs() async {
    final prefs = ref.read(loginPrefsProvider);
    final saved = await prefs.lastIdentifier();
    final remember = await prefs.remember();
    if (!mounted) return;
    setState(() {
      if (saved != null && _identifier.text.isEmpty) _identifier.text = saved;
      _remember = remember;
    });
  }

  @override
  void dispose() {
    _identifier.dispose();
    _password.dispose();
    _identifierFocus.dispose();
    _passwordFocus.dispose();
    super.dispose();
  }

  bool _validate() {
    setState(() {
      _identifierError = _identifier.text.trim().isEmpty ? 'Утас, имэйл эсвэл нэвтрэх нэрээ оруулна уу' : null;
      _passwordError = _password.text.isEmpty ? 'Нууц үгээ оруулна уу' : null;
    });
    // Анхны алдаатай талбарт фокус — дэлгэц уншигч хаана алдаа гарсныг шууд мэдэгдэнэ.
    if (_identifierError != null) {
      _identifierFocus.requestFocus();
    } else if (_passwordError != null) {
      _passwordFocus.requestFocus();
    }
    return _identifierError == null && _passwordError == null;
  }

  Future<void> _submit() async {
    if (_loading) return;
    setState(() {
      _authError = null;
      _info = null;
    });
    if (!_validate()) return;
    setState(() => _loading = true);
    try {
      final identifier = _identifier.text.trim();
      final result = await ref
          .read(authRepositoryProvider)
          .login(identifier: identifier, password: _password.text, remember: _remember);
      await ref.read(loginPrefsProvider).save(identifier: identifier, remember: _remember);
      await ref
          .read(sessionProvider.notifier)
          .signIn(token: result.accessToken, userId: result.userId, role: result.role, remember: _remember);
      // Router redirect энэ дэлгэцийг солино.
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() {
        _authError = e.message;
        _failCount++;
      });
      _passwordFocus.requestFocus();
      _password.selection = TextSelection(baseOffset: 0, extentOffset: _password.text.length);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final notice = ref.watch(loginTextProvider).value ?? '';
    final showHelp = _failCount >= helpAfterAttempts;

    return AuthScaffold(
      child: AutofillGroup(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const LoginHero(),
            Semantics(header: true, child: Text('Нэвтрэх', style: context.text.headlineMedium)),
            const SizedBox(height: AppSpace.xs),
            Text(
              'Сургалтын төвийн бүртгэлээрээ орно уу',
              style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
            ),
            const SizedBox(height: AppSpace.lg),
            if (notice.isNotEmpty) ...[_LoginNotice(body: notice), const SizedBox(height: AppSpace.lg)],
            if (_info != null) ...[FormMessage(message: _info, isError: false), const SizedBox(height: AppSpace.lg)],
            Row(
              children: [
                Expanded(child: Text('Утас, имэйл эсвэл нэвтрэх нэр', style: context.text.labelLarge)),
                const InfoHint(
                  title: 'Юу бичих вэ',
                  message:
                      'Гурвын аль нэгээр нэвтэрч болно — бүртгүүлэхдээ өгсөн утасны дугаар, эсвэл '
                      'бүртгэлдээ нэмсэн имэйл хаяг, эсвэл нэвтрэх нэр. Ихэнх сурагч утасны дугаараа хэрэглэдэг.',
                ),
              ],
            ),
            TextField(
              controller: _identifier,
              focusNode: _identifierFocus,
              enabled: !_loading,
              keyboardType: TextInputType.emailAddress,
              autocorrect: false,
              enableSuggestions: false,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.username],
              onSubmitted: (_) => _passwordFocus.requestFocus(),
              onChanged: (_) {
                if (_identifierError != null) setState(() => _identifierError = null);
              },
              decoration: InputDecoration(
                hintText: '99112233',
                errorText: _identifierError,
                prefixIcon: const Icon(AppIcons.user, size: 20),
              ),
            ),
            const SizedBox(height: AppSpace.lg),
            Row(
              children: [
                Expanded(child: Text('Нууц үг', style: context.text.labelLarge)),
                const InfoHint(
                  title: 'Нууц үгээ мэдэхгүй байна уу',
                  message:
                      'Анх удаа нэвтэрч байгаа бол нууц үг тань утасны дугаар (8 орон). '
                      'Нэвтэрсний дараа «Миний мэдээлэл» хэсгээс өөрчилж болно.',
                ),
              ],
            ),
            PasswordField(
              controller: _password,
              focusNode: _passwordFocus,
              label: 'Нууц үг',
              obscure: _obscure,
              enabled: !_loading,
              onToggleObscure: () => setState(() => _obscure = !_obscure),
              errorText: _passwordError,
              autofillHint: AutofillHints.password,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
              onChanged: (_) {
                if (_passwordError != null || _authError != null) {
                  setState(() {
                    _passwordError = null;
                    _authError = null;
                  });
                }
              },
            ),
            const SizedBox(height: AppSpace.sm),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    onTap: _loading ? null : () => setState(() => _remember = !_remember),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                      child: Row(
                        children: [
                          Checkbox(
                            value: _remember,
                            onChanged: _loading ? null : (v) => setState(() => _remember = v ?? true),
                          ),
                          Flexible(child: Text('Намайг сана', style: context.text.bodyMedium)),
                        ],
                      ),
                    ),
                  ),
                ),
                const InfoHint(
                  title: 'Намайг сана гэж юу вэ',
                  message:
                      'Чагталбал энэ утсан дээр 30 хоног нэвтэрсэн хэвээр байна. Бусдын утсаар '
                      'нэвтэрч байгаа бол чагтыг авна уу — аппыг хаамагц гарна.',
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            FormMessage(message: _authError),
            const SizedBox(height: AppSpace.lg),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? Semantics(label: 'Нэвтэрч байна', child: const ButtonProgress())
                  : const Text('Нэвтрэх'),
            ),
            const SizedBox(height: AppSpace.lg),
            if (showHelp)
              OutlinedButton.icon(
                icon: Icon(AppIcons.key, size: 18, color: context.colors.brand),
                label: Text('Нууц үгээ сэргээх', style: TextStyle(color: context.colors.brand)),
                onPressed: () => context.push('/forgot-password'),
              )
            else
              Center(
                child: TextButton(
                  onPressed: () => context.push('/forgot-password'),
                  child: const Text('Нууц үгээ мартсан уу?'),
                ),
              ),
            const SizedBox(height: AppSpace.lg),
            NativeSignInSection(remember: _remember, enabled: !_loading),
            Divider(color: context.colors.line),
            const SizedBox(height: AppSpace.sm),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Flexible(
                  child: Text(
                    'Шинэ хэрэглэгч үү?',
                    style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                  ),
                ),
                TextButton(onPressed: () => context.push('/register'), child: const Text('Бүртгүүлэх')),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Сургалтын төвийн зарлал — энгийн текст, мөр шилжилттэй.
class _LoginNotice extends StatelessWidget {
  const _LoginNotice({required this.body});

  final String body;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      label: 'Сургалтын төвийн мэдээлэл',
      child: AppCard(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(AppIcons.megaphone, size: 18, color: context.colors.brand),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: Text(body, style: context.text.bodyMedium)),
          ],
        ),
      ),
    );
  }
}
