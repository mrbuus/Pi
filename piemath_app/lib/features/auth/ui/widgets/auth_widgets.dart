import 'package:flutter/material.dart';

import '../../../../core/ui/ui.dart';
import '../../domain/password_policy.dart';

/// Нууц үгийн талбар + «Нууц үг харах» товч (өгөгдмөл ХААЛТТАЙ — мөрдөгчөөс хамгаална, STATUS §7.2).
/// Харах төлвийг эцэг widget барина — нэг маягтын бүх талбар зэрэг нээгдэнэ.
class PasswordField extends StatelessWidget {
  const PasswordField({
    super.key,
    required this.controller,
    required this.label,
    required this.obscure,
    required this.onToggleObscure,
    this.focusNode,
    this.errorText,
    this.autofillHint,
    this.textInputAction = TextInputAction.next,
    this.onSubmitted,
    this.onChanged,
    this.enabled = true,
  });

  final TextEditingController controller;
  final String label;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final FocusNode? focusNode;
  final String? errorText;
  final String? autofillHint;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onSubmitted;
  final ValueChanged<String>? onChanged;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      focusNode: focusNode,
      enabled: enabled,
      obscureText: obscure,
      autocorrect: false,
      enableSuggestions: false,
      textInputAction: textInputAction,
      onSubmitted: onSubmitted,
      onChanged: onChanged,
      autofillHints: autofillHint == null ? null : [autofillHint!],
      decoration: InputDecoration(
        labelText: label,
        errorText: errorText,
        errorMaxLines: 3,
        suffixIcon: IconButton(
          tooltip: obscure ? 'Нууц үгийг харах' : 'Нууц үгийг нуух',
          icon: Icon(obscure ? AppIcons.show : AppIcons.hide, size: 20),
          onPressed: onToggleObscure,
        ),
      ),
    );
  }
}

/// Шинэ нууц үгийн шаардлагыг шивэх зуур харуулна (вэбийн `PasswordChecklist`).
/// Хоосон үед саарал, биелсэн мөр ногоон + зөв тэмдэг — өнгө дангаараа утга илэрхийлэхгүй.
class PasswordChecklist extends StatelessWidget {
  const PasswordChecklist({super.key, required this.value});

  final String value;

  @override
  Widget build(BuildContext context) {
    final c = passwordChecks(value);
    final empty = value.isEmpty;
    final rows = <(bool, String)>[(c.length, '$passwordMinLength+ тэмдэгт'), (c.letter, 'Үсэг'), (c.digit, 'Тоо')];
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.sm, left: AppSpace.xs),
      child: Wrap(
        spacing: AppSpace.lg,
        runSpacing: AppSpace.xs,
        children: [
          for (final (ok, label) in rows)
            Semantics(
              label: '$label: ${ok ? 'биелсэн' : 'дутуу'}',
              excludeSemantics: true,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    ok ? AppIcons.check : AppIcons.close,
                    size: 14,
                    color: ok ? context.colors.success : (empty ? context.colors.inkDim : context.colors.error),
                  ),
                  const SizedBox(width: AppSpace.xs),
                  Text(
                    label,
                    style: context.text.bodySmall?.copyWith(
                      color: ok ? context.colors.success : (empty ? context.colors.inkDim : context.colors.error),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// Маягтын ерөнхий алдаа (талбарт биш — сервер аль талбар буруу болохыг санаатайгаар хэлдэггүй).
/// Дэвсгэр өнгөгүй (RULES §3) — улаан дүрс + нимгэн улаан хүрээ.
class FormMessage extends StatelessWidget {
  const FormMessage({super.key, required this.message, this.isError = true, this.icon});

  final String? message;
  final bool isError;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final m = message;
    return Semantics(
      liveRegion: true,
      child: AnimatedSize(
        duration: AppMotion.of(context, AppMotion.base),
        alignment: Alignment.topCenter,
        child: m == null || m.isEmpty
            ? const SizedBox(width: double.infinity)
            : Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.md),
                decoration: BoxDecoration(
                  color: context.colors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: isError ? context.colors.error : context.colors.line),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      icon ?? (isError ? AppIcons.warning : AppIcons.info),
                      size: 18,
                      color: isError ? context.colors.error : context.colors.brand,
                    ),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(child: Text(m, style: context.text.bodyMedium)),
                  ],
                ),
              ),
      ),
    );
  }
}

/// Илгээж буй үед товчны доторх жижиг эргэлдэгч.
class ButtonProgress extends StatelessWidget {
  const ButtonProgress({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: 20,
      child: CircularProgressIndicator(strokeWidth: 2.4, color: context.colors.onBrand),
    );
  }
}

/// Шинэ нууц үг + давтах (сэргээх, солих хоёрт ижил).
class NewPasswordFields extends StatelessWidget {
  const NewPasswordFields({
    super.key,
    required this.password,
    required this.confirm,
    required this.obscure,
    required this.onToggleObscure,
    required this.onChanged,
    this.passwordError,
    this.enabled = true,
    this.onSubmitted,
  });

  final TextEditingController password;
  final TextEditingController confirm;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final VoidCallback onChanged;
  final String? passwordError;
  final bool enabled;
  final VoidCallback? onSubmitted;

  @override
  Widget build(BuildContext context) {
    final matches = confirm.text.isNotEmpty && confirm.text == password.text;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        PasswordField(
          controller: password,
          label: 'Шинэ нууц үг',
          obscure: obscure,
          onToggleObscure: onToggleObscure,
          errorText: passwordError,
          enabled: enabled,
          autofillHint: AutofillHints.newPassword,
          onChanged: (_) => onChanged(),
        ),
        PasswordChecklist(value: password.text),
        const SizedBox(height: AppSpace.lg),
        PasswordField(
          controller: confirm,
          label: 'Шинэ нууц үг давтах',
          obscure: obscure,
          onToggleObscure: onToggleObscure,
          enabled: enabled,
          autofillHint: AutofillHints.newPassword,
          textInputAction: TextInputAction.done,
          onSubmitted: onSubmitted == null ? null : (_) => onSubmitted!(),
          onChanged: (_) => onChanged(),
        ),
        if (confirm.text.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.sm, left: AppSpace.xs),
            child: Row(
              children: [
                Icon(
                  matches ? AppIcons.check : AppIcons.close,
                  size: 14,
                  color: matches ? context.colors.success : context.colors.error,
                ),
                const SizedBox(width: AppSpace.xs),
                Flexible(
                  child: Text(
                    matches ? 'Таарч байна' : passwordMismatchMessage,
                    style: context.text.bodySmall?.copyWith(
                      color: matches ? context.colors.success : context.colors.error,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

/// Нэвтрэлтгүй хуудасны (нэвтрэх, сэргээх) нийтлэг хүрээ: төвд, 420dp-ээс өргөнгүй, гүйлгэдэг.
class AuthScaffold extends StatelessWidget {
  const AuthScaffold({super.key, required this.child, this.appBar});

  final Widget child;
  final PreferredSizeWidget? appBar;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: appBar,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.xl, vertical: AppSpace.xl),
            keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
            child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420), child: child),
          ),
        ),
      ),
    );
  }
}
