import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/register_repository.dart';
import 'widgets/auth_widgets.dart';

/// Багшаар бүртгүүлэх (`/teacher-register`) — вэбийн `RegisterExternalTeacher`-тэй ижил: имэйл, нэр, овог,
/// нууц үг (8+), ажилладаг газар. Бүртгэл нь ангийн бүлэг үүсгэх эрх л өгнө (төвийн ажилтны эрх биш).
class TeacherRegisterScreen extends ConsumerStatefulWidget {
  const TeacherRegisterScreen({super.key});

  @override
  ConsumerState<TeacherRegisterScreen> createState() => _TeacherRegisterScreenState();
}

class _TeacherRegisterScreenState extends ConsumerState<TeacherRegisterScreen> {
  final _email = TextEditingController();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _password = TextEditingController();
  final _org = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  bool _done = false;
  Map<String, String> _errors = const {};
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _firstName.dispose();
    _lastName.dispose();
    _password.dispose();
    _org.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_loading) return;
    final form = TeacherRegisterForm(
      email: _email.text,
      firstName: _firstName.text,
      lastName: _lastName.text,
      password: _password.text,
      organization: _org.text,
    );
    final errors = validateTeacherRegister(form);
    setState(() {
      _errors = errors;
      _error = null;
    });
    if (errors.isNotEmpty) return;
    setState(() => _loading = true);
    try {
      await ref.read(registerRepositoryProvider).registerTeacher(form);
      if (mounted) setState(() => _done = true);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AuthScaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Багшийн бүртгэл')),
      child: _done ? _success(context) : _form(context),
    );
  }

  Widget _success(BuildContext context) => AppCard(
        accent: context.colors.success,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Бүртгэл үүслээ', style: context.text.titleMedium?.copyWith(color: context.colors.success)),
            const SizedBox(height: AppSpace.sm),
            Text(
              'Бүртгүүлсэн имэйл, нууц үгээрээ нэвтэрч «Анги удирдах» хэсгээс ангийн бүлгээ үүсгэнэ үү. Админы '
              'зөвшөөрөл хүлээх шаардлагагүй',
              style: context.text.bodyMedium,
            ),
            const SizedBox(height: AppSpace.lg),
            FilledButton(onPressed: () => context.go('/login'), child: const Text('Нэвтрэх')),
          ],
        ),
      );

  Widget _form(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Ангийн бүлгээ үүсгээрэй', style: context.text.titleLarge),
        const SizedBox(height: AppSpace.xs),
        Text(
          'Бүртгүүлээд ангийн бүлэг үүсгэж, нэгдэх кодоо сурагчдадаа өгнө. Энэ бүртгэл нь төвийн ажилтны эрх эсвэл '
          'мэргэжлийн баталгаажуулалт олгохгүй',
          style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
        ),
        const SizedBox(height: AppSpace.lg),
        TextField(
          controller: _email,
          enabled: !_loading,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          autofillHints: const [AutofillHints.email],
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(labelText: 'Имэйл', errorText: _errors['email']),
        ),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: _firstName,
          enabled: !_loading,
          autofillHints: const [AutofillHints.givenName],
          textInputAction: TextInputAction.next,
          maxLength: 100,
          decoration: InputDecoration(labelText: 'Нэр', errorText: _errors['firstName'], counterText: ''),
        ),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: _lastName,
          enabled: !_loading,
          autofillHints: const [AutofillHints.familyName],
          textInputAction: TextInputAction.next,
          maxLength: 100,
          decoration: InputDecoration(labelText: 'Овог', errorText: _errors['lastName'], counterText: ''),
        ),
        const SizedBox(height: AppSpace.md),
        PasswordField(
          controller: _password,
          label: 'Нууц үг',
          obscure: _obscure,
          enabled: !_loading,
          autofillHint: AutofillHints.newPassword,
          errorText: _errors['password'],
          onToggleObscure: () => setState(() => _obscure = !_obscure),
        ),
        const SizedBox(height: AppSpace.xs),
        Text('8 ба түүнээс олон тэмдэгт', style: context.text.bodySmall),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: _org,
          enabled: !_loading,
          autofillHints: const [AutofillHints.organizationName],
          maxLength: 255,
          decoration: const InputDecoration(labelText: 'Ажилладаг сургууль, төв', helperText: 'Заавал биш', counterText: ''),
        ),
        const SizedBox(height: AppSpace.md),
        FormMessage(message: _error),
        const SizedBox(height: AppSpace.md),
        FilledButton(
          onPressed: _loading ? null : _submit,
          child: _loading ? const ButtonProgress() : const Text('Бүртгүүлэх'),
        ),
      ],
    );
  }
}
