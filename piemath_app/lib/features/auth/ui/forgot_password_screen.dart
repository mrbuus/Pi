import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/auth_models.dart';
import '../data/auth_repository.dart';
import '../domain/password_policy.dart';
import 'widgets/auth_widgets.dart';

/// SMS кодын урт.
const resetCodeLength = 6;

/// Дахин илгээх хүртэлх хүлээлт (сервер ч 15 минутад 3 удаа гэсэн хязгаартай).
const resendCooldownSec = 60;

/// Имэйлийн холбоосын токен (`/forgot-password#t=<токен>`).
final _linkTokenPattern = RegExp(r'(?:^|&)t=([A-Za-z0-9_-]{20,200})(?:&|$)');

/// URL-ийн fragment-аас имэйлийн холбоосын токеныг гаргана. Байхгүй бол null.
String? linkTokenFromFragment(String fragment) => _linkTokenPattern.firstMatch(fragment)?.group(1);

/// 545 → «9:05».
String mmss(int total) => '${total ~/ 60}:${(total % 60).toString().padLeft(2, '0')}';

enum ResetStep { identify, sent, verify, link, done }

/// Сэргээх үйлчилгээ тохируулагдаагүй үед сервер 503 + монгол тайлбар («сургалтын төвтэй холбогдоно уу»)
/// буцаадаг — энэ нь техникийн биш, хэрэглэгчид хэрэгтэй заавар тул шууд харуулна.
String resetErrorMessage(ApiError e) {
  final server = ApiError.serverMessage(e.body);
  if (e.status == 503 && server != null && ApiError.isMongolian(server)) return server;
  return e.message;
}

/// Нууц үг сэргээх — 2 алхам (STATUS §7.2, вэбийн `app/forgot-password/page.tsx`).
///
/// 1) Утас / имэйл / нэвтрэх нэр → сервер имэйл холбоос эсвэл SMS код илгээнэ (бүртгэл байгаа эсэхийг илчлэхгүй).
/// 2) SMS код + шинэ нууц үг НЭГ дор (код урьдчилж шалгах endpoint брутфорсын гадаргуу болно).
/// «Имэйл, код ирэхгүй байна уу?» тусламж бүтэлгүйтмэгц ӨӨРӨӨ нээгдэж, ажилладаг өөр замыг заана.
class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key, this.linkToken});

  /// Имэйлээр ирсэн холбоосоор нээгдсэн бол шууд «Шинэ нууц үг» алхам.
  final String? linkToken;

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  final _identifier = TextEditingController();
  final _code = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();

  late ResetStep _step = widget.linkToken != null ? ResetStep.link : ResetStep.identify;
  ForgotResult? _sent;
  bool _obscure = true;
  bool _loading = false;
  bool _helpOpen = false;
  String? _error;
  int _cooldown = 0;
  int _codeLeft = 0;
  Timer? _ticker;

  @override
  void dispose() {
    _ticker?.cancel();
    _identifier.dispose();
    _code.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  void _startTicker() {
    _ticker?.cancel();
    _ticker = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) return;
      setState(() {
        if (_cooldown > 0) _cooldown--;
        if (_codeLeft > 0) _codeLeft--;
      });
      if (_cooldown == 0 && _codeLeft == 0) t.cancel();
    });
  }

  Future<void> _request({bool resend = false}) async {
    if (_identifier.text.trim().isEmpty) {
      setState(() => _error = 'Утас, имэйл эсвэл нэвтрэх нэрээ оруулна уу');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await ref.read(authRepositoryProvider).forgotPassword(_identifier.text);
      if (!mounted) return;
      setState(() {
        _sent = res;
        _step = res.sms ? ResetStep.verify : ResetStep.sent;
        _cooldown = resendCooldownSec;
        _codeLeft = res.sms ? res.expiresInSeconds : 0;
        _helpOpen = false;
        if (resend) _code.clear();
      });
      _startTicker();
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() {
        _error = resetErrorMessage(e);
        _helpOpen = true;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _passwordProblem() {
    if (!isPasswordStrong(_password.text)) return passwordPolicyMessage;
    if (_password.text.length > passwordMaxLength) return passwordTooLongMessage;
    if (_password.text != _confirm.text) return passwordMismatchMessage;
    return null;
  }

  Future<void> _submitCode() async {
    setState(() => _error = null);
    if (_code.text.length != resetCodeLength) {
      setState(() => _error = 'Код $resetCodeLength оронтой байна');
      return;
    }
    final problem = _passwordProblem();
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() => _loading = true);
    try {
      await ref
          .read(authRepositoryProvider)
          .resetPassword(identifier: _identifier.text, code: _code.text, newPassword: _password.text);
      if (mounted) setState(() => _step = ResetStep.done);
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _helpOpen = true;
      });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitLink() async {
    setState(() => _error = null);
    final problem = _passwordProblem();
    if (problem != null) {
      setState(() => _error = problem);
      return;
    }
    setState(() => _loading = true);
    try {
      await ref
          .read(authRepositoryProvider)
          .resetPasswordWithLink(token: widget.linkToken!, newPassword: _password.text);
      if (mounted) setState(() => _step = ResetStep.done);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _restart() {
    _ticker?.cancel();
    setState(() {
      _step = ResetStep.identify;
      _error = null;
      _code.clear();
      _codeLeft = 0;
    });
  }

  void _toLogin() => context.canPop() ? context.pop() : context.go('/login');

  @override
  Widget build(BuildContext context) {
    final stepNo = _step == ResetStep.identify ? 1 : 2;
    return AuthScaffold(
      appBar: AppBar(
        leading: IconButton(icon: const Icon(AppIcons.back), tooltip: AppStrings.back, onPressed: _toLogin),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_step != ResetStep.done) ...[_StepIndicator(step: stepNo), const SizedBox(height: AppSpace.lg)],
          ...switch (_step) {
            ResetStep.identify => _identifyStep(context),
            ResetStep.sent => _sentStep(context),
            ResetStep.verify => _verifyStep(context),
            ResetStep.link => _linkStep(context),
            ResetStep.done => _doneStep(context),
          },
          if (_step == ResetStep.identify || _step == ResetStep.sent || _step == ResetStep.verify) ...[
            const SizedBox(height: AppSpace.xl),
            Divider(color: context.colors.line),
            _HelpSection(open: _helpOpen, onToggle: () => setState(() => _helpOpen = !_helpOpen)),
          ],
          if (_step != ResetStep.done) ...[
            const SizedBox(height: AppSpace.md),
            Center(
              child: TextButton.icon(
                icon: const Icon(AppIcons.back, size: 18),
                label: const Text('Нэвтрэх хуудас руу буцах'),
                onPressed: _toLogin,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _title(BuildContext context, String text) =>
      Semantics(header: true, child: Text(text, style: context.text.headlineSmall));

  Widget _dim(BuildContext context, String text) =>
      Text(text, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim));

  Widget _submitButton(VoidCallback onPressed, String label, {bool enabled = true}) => FilledButton(
    onPressed: _loading || !enabled ? null : onPressed,
    child: _loading ? const ButtonProgress() : Text(label),
  );

  List<Widget> _identifyStep(BuildContext context) => [
    _title(context, 'Нууц үг сэргээх'),
    const SizedBox(height: AppSpace.sm),
    _dim(context, 'Бүртгэлд тань Gmail эсвэл имэйл холбогдсон бол тэр хаяг руу сэргээх холбоос илгээнэ'),
    const SizedBox(height: AppSpace.xl),
    Row(
      children: [
        Expanded(child: Text('Утас, имэйл эсвэл нэвтрэх нэр', style: context.text.labelLarge)),
        const InfoHint(
          title: 'Юу бичих вэ',
          message: 'Нэвтрэхдээ хэрэглэдэг утасны дугаар, имэйл хаяг эсвэл холбосон Gmail хаягаа бичнэ үү.',
        ),
      ],
    ),
    TextField(
      controller: _identifier,
      enabled: !_loading,
      keyboardType: TextInputType.emailAddress,
      autocorrect: false,
      enableSuggestions: false,
      textInputAction: TextInputAction.done,
      autofillHints: const [AutofillHints.username],
      onSubmitted: (_) => _request(),
      onChanged: (_) {
        if (_error != null) setState(() => _error = null);
      },
      decoration: const InputDecoration(hintText: '99112233', prefixIcon: Icon(AppIcons.user, size: 20)),
    ),
    const SizedBox(height: AppSpace.md),
    FormMessage(message: _error),
    const SizedBox(height: AppSpace.lg),
    _submitButton(_request, 'Сэргээх холбоос авах'),
  ];

  Widget _resendRow(String resendLabel, String changeLabel) => Wrap(
    alignment: WrapAlignment.spaceBetween,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      TextButton(
        onPressed: _cooldown > 0 || _loading ? null : () => _request(resend: true),
        child: Text(_cooldown > 0 ? 'Дахин илгээх ($_cooldownс)' : resendLabel),
      ),
      TextButton(onPressed: _restart, child: Text(changeLabel)),
    ],
  );

  List<Widget> _sentStep(BuildContext context) {
    final minutes = ((_sent?.linkExpiresInSeconds ?? 1800) / 60).round();
    return [
      Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(AppIcons.mailCheck, color: context.colors.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(child: _title(context, 'Имэйлээ шалгана уу')),
        ],
      ),
      const SizedBox(height: AppSpace.sm),
      _dim(
        context,
        '${_sent?.maskedTo ?? ''} бүртгэлд Gmail эсвэл имэйл холбогдсон бол тэр хаяг руу нууц үг сэргээх '
        'холбоос илгээлээ. Холбоос $minutes минут хүчинтэй, нэг л удаа ажиллана.',
      ),
      const SizedBox(height: AppSpace.lg),
      AppCard(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Text(
          'Бүртгэл тань зөвхөн утастай, имэйлгүй бол сургалтын төвд хандаж нууц үгээ сэргээлгэнэ үү.',
          style: context.text.bodyMedium,
        ),
      ),
      const SizedBox(height: AppSpace.sm),
      _resendRow('Дахин илгээх', 'Өөр хаяг оруулах'),
      FormMessage(message: _error),
    ];
  }

  List<Widget> _verifyStep(BuildContext context) {
    final expired = _codeLeft == 0;
    return [
      _title(context, 'Код оруулах'),
      const SizedBox(height: AppSpace.sm),
      _dim(context, '${_sent?.maskedTo ?? ''} дугаар руу $resetCodeLength оронтой код илгээлээ'),
      if (_sent?.email ?? false) ...[
        const SizedBox(height: AppSpace.sm),
        const FormMessage(
          isError: false,
          icon: AppIcons.mailCheck,
          message: 'Бүртгэлд Gmail эсвэл имэйл холбогдсон бол код биш, сэргээх холбоос имэйлээр очно',
        ),
      ],
      const SizedBox(height: AppSpace.lg),
      TextField(
        controller: _code,
        enabled: !_loading,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        autofillHints: const [AutofillHints.oneTimeCode],
        inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(resetCodeLength)],
        style: context.text.headlineSmall?.copyWith(letterSpacing: 8),
        onChanged: (_) {
          if (_error != null) setState(() => _error = null);
        },
        decoration: const InputDecoration(labelText: 'Сэргээх код', hintText: '123456'),
      ),
      const SizedBox(height: AppSpace.sm),
      Semantics(
        liveRegion: true,
        child: Text(
          expired ? 'Кодын хугацаа дууслаа. Дахин илгээнэ үү' : 'Код ${mmss(_codeLeft)}-ын дараа хүчингүй болно',
          style: context.text.bodySmall?.copyWith(color: expired ? context.colors.error : context.colors.inkDim),
        ),
      ),
      _resendRow('Код дахин илгээх', 'Дугаар солих'),
      const SizedBox(height: AppSpace.sm),
      NewPasswordFields(
        password: _password,
        confirm: _confirm,
        obscure: _obscure,
        enabled: !_loading,
        onToggleObscure: () => setState(() => _obscure = !_obscure),
        onChanged: () => setState(() => _error = null),
        onSubmitted: _submitCode,
      ),
      const SizedBox(height: AppSpace.md),
      FormMessage(message: _error),
      const SizedBox(height: AppSpace.lg),
      _submitButton(_submitCode, 'Нууц үг солих', enabled: isPasswordStrong(_password.text)),
    ];
  }

  List<Widget> _linkStep(BuildContext context) => [
    _title(context, 'Шинэ нууц үг'),
    const SizedBox(height: AppSpace.sm),
    _dim(context, 'Имэйлээр ирсэн холбоос — шинэ нууц үгээ хоёр удаа бичнэ үү'),
    const SizedBox(height: AppSpace.xl),
    NewPasswordFields(
      password: _password,
      confirm: _confirm,
      obscure: _obscure,
      enabled: !_loading,
      onToggleObscure: () => setState(() => _obscure = !_obscure),
      onChanged: () => setState(() => _error = null),
      onSubmitted: _submitLink,
    ),
    const SizedBox(height: AppSpace.md),
    FormMessage(message: _error),
    const SizedBox(height: AppSpace.lg),
    _submitButton(_submitLink, 'Нууц үг солих', enabled: isPasswordStrong(_password.text)),
    if (_error != null) TextButton(onPressed: _restart, child: const Text('Шинэ холбоос авах')),
  ];

  List<Widget> _doneStep(BuildContext context) => [
    Icon(AppIcons.success, size: 40, color: context.colors.success),
    const SizedBox(height: AppSpace.lg),
    _title(context, 'Нууц үг солигдлоо'),
    const SizedBox(height: AppSpace.sm),
    _dim(context, 'Шинэ нууц үгээрээ нэвтэрнэ үү. Бусад төхөөрөмж дээрх нэвтрэлт аюулгүй байдлын үүднээс тасарсан.'),
    const SizedBox(height: AppSpace.xl),
    FilledButton(onPressed: () => context.go('/login'), child: const Text('Нэвтрэх')),
  ];
}

class _StepIndicator extends StatelessWidget {
  const _StepIndicator({required this.step});

  final int step;

  @override
  Widget build(BuildContext context) {
    Widget bar(bool on) => Expanded(
      child: Container(
        height: 4,
        decoration: BoxDecoration(
          color: on ? context.colors.brandBright : context.colors.line,
          borderRadius: BorderRadius.circular(AppRadius.pill),
        ),
      ),
    );
    return Semantics(
      label: 'Алхам $step / 2',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Алхам $step / 2', style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
          const SizedBox(height: AppSpace.sm),
          Row(
            children: [
              bar(true),
              const SizedBox(width: AppSpace.sm),
              bar(step == 2),
            ],
          ),
        ],
      ),
    );
  }
}

/// «Имэйл, код ирэхгүй байна уу?» — бодит шалтгаан бүр ба АЖИЛЛАДАГ өөр зам.
class _HelpSection extends StatelessWidget {
  const _HelpSection({required this.open, required this.onToggle});

  final bool open;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    Widget item(String title, String body) => Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.md),
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(
              text: '$title ',
              style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
            ),
            TextSpan(text: body),
          ],
        ),
        style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          button: true,
          expanded: open,
          child: InkWell(
            onTap: onToggle,
            borderRadius: BorderRadius.circular(AppRadius.sm),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap),
              child: Row(
                children: [
                  Expanded(child: Text('Имэйл, код ирэхгүй байна уу?', style: context.text.titleSmall)),
                  AnimatedRotation(
                    turns: open ? 0.5 : 0,
                    duration: AppMotion.of(context, AppMotion.base),
                    child: Icon(AppIcons.expand, size: 18, color: context.colors.inkDim),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (open) ...[
          const SizedBox(height: AppSpace.sm),
          item('Спам хавтсаа шалгана уу.', 'Имэйл 1–2 минут саатаж, заримдаа «Спам» хэсэгт ордог.'),
          item(
            'Gmail холбосон эсэхээ шалгана уу.',
            'Холбоос зөвхөн бүртгэлдээ нэмсэн имэйл эсвэл «Миний мэдээлэл»-ээс холбосон Gmail руу очно.',
          ),
          item('Бичсэнээ шалгана уу.', 'Утасны дугаараа 8 оронтойгоор, зайгүй бичнэ.'),
          AppCard(
            padding: const EdgeInsets.all(AppSpace.md),
            child: Text.rich(
              TextSpan(
                children: [
                  TextSpan(
                    text: 'Сургалтын төвд хандана уу. ',
                    style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const TextSpan(text: 'Багш эсвэл админ таны бүртгэлийн нууц үгийг сэргээж өгнө.'),
                ],
              ),
              style: context.text.bodyMedium,
            ),
          ),
        ],
      ],
    );
  }
}
