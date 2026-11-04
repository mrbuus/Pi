import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/auth_repository.dart';
import '../domain/password_policy.dart';
import 'widgets/auth_widgets.dart';

/// Нууц үг солих маягт (профайл доторх хэсэг ба `/app/password` хоёуланд ижил — вэбийн
/// `ChangePasswordSection`). Амжилттай бол сервер ШИНЭ токен өгнө → [SessionController.replaceToken].
class ChangePasswordForm extends ConsumerStatefulWidget {
  const ChangePasswordForm({super.key});

  @override
  ConsumerState<ChangePasswordForm> createState() => _ChangePasswordFormState();
}

class _ChangePasswordFormState extends ConsumerState<ChangePasswordForm> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();

  bool _obscure = true;
  bool _loading = false;
  bool _submitted = false;
  bool _ok = false;
  String? _error;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String? get _phone {
    final s = ref.read(sessionProvider);
    return s is SignedIn ? s.user?.phone : null;
  }

  String? get _currentError => _submitted && _current.text.isEmpty ? 'Одоогийн нууц үгээ оруулна уу' : null;

  String? get _nextError {
    if (!_submitted) return null;
    if (_next.text.isEmpty) return 'Шинэ нууц үгээ оруулна уу';
    return validateNewPassword(_next.text, phone: _phone);
  }

  Future<void> _submit() async {
    setState(() {
      _submitted = true;
      _ok = false;
      _error = null;
    });
    if (_currentError != null || _nextError != null) return;
    if (_confirm.text != _next.text) {
      setState(() => _error = _confirm.text.isEmpty ? 'Шинэ нууц үгээ дахин бичнэ үү' : passwordMismatchMessage);
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await ref
          .read(authRepositoryProvider)
          .changePassword(currentPassword: _current.text, newPassword: _next.text);
      await ref.read(sessionProvider.notifier).replaceToken(res.accessToken);
      if (!mounted) return;
      setState(() {
        _ok = true;
        _submitted = false;
        _current.clear();
        _next.clear();
        _confirm.clear();
      });
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AutofillGroup(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Анхны нууц үг тань утасны дугаар байсан бол заавал солиорой',
            style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
          ),
          const SizedBox(height: AppSpace.lg),
          PasswordField(
            controller: _current,
            label: 'Одоогийн нууц үг',
            obscure: _obscure,
            enabled: !_loading,
            onToggleObscure: () => setState(() => _obscure = !_obscure),
            errorText: _currentError,
            autofillHint: AutofillHints.password,
            onChanged: (_) => setState(() {
              _error = null;
              _ok = false;
            }),
          ),
          const SizedBox(height: AppSpace.lg),
          NewPasswordFields(
            password: _next,
            confirm: _confirm,
            obscure: _obscure,
            enabled: !_loading,
            passwordError: _nextError,
            onToggleObscure: () => setState(() => _obscure = !_obscure),
            onChanged: () => setState(() {
              _error = null;
              _ok = false;
            }),
            onSubmitted: _submit,
          ),
          const SizedBox(height: AppSpace.md),
          FormMessage(message: _error),
          if (_ok)
            const FormMessage(
              isError: false,
              icon: AppIcons.success,
              message: 'Нууц үг амжилттай солигдлоо. Аюулгүй байдлын үүднээс бусад төхөөрөмж дээрх нэвтрэлт тасарсан.',
            ),
          const SizedBox(height: AppSpace.lg),
          FilledButton(
            onPressed: _loading ? null : _submit,
            child: _loading ? const ButtonProgress() : const Text('Нууц үг солих'),
          ),
        ],
      ),
    );
  }
}
