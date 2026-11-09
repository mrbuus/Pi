import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/register_repository.dart';
import 'widgets/auth_widgets.dart';
import 'widgets/consent_fields.dart';

/// `/register`-д дамжуулах нэмэлт (Google-ээр нэвтрэх гэсэн ч бүртгэлгүй Gmail-ийн тасалбар).
class RegisterArgs {
  const RegisterArgs({this.googleTicket});

  final String? googleTicket;
}

/// Бүртгүүлэх (`/register`) — вэбийн `app/register/page.tsx`-тэй ижил урсгал, талбар, шалгалт.
///
/// 1) Та хэн бэ: танхимын сурагч / төвийн онлайн анги (серверээр нээгдсэн бол) / бие даан суралцах / эцэг эх
/// 2) Овог, нэр, утас (анхны нууц үг = утас); сурагчид анги, сургууль, хичээл; танхимд багшийн өнөөдрийн код
/// 3) Нөхцөл, насны ангилал, эцэг эхийн зөвшөөрөл → `POST /auth/register`
/// SMS код шаарддаггүй (вэб ч үгүй). Апп дотор худалдан авалт БАЙХГҮЙ.
class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key, this.googleTicket});

  final String? googleTicket;

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _lastName = TextEditingController();
  final _firstName = TextEditingController();
  final _phone = TextEditingController();
  final _school = TextEditingController();
  final _code = TextEditingController();

  RegisterKind? _kind;
  int _grade = 12;
  final _subjects = <RegisterSubject>{};
  RegisterSubject? _explain;
  ConsentValue _consent = const ConsentValue();
  Map<String, String> _errors = const {};
  String? _submitError;
  bool _loading = false;
  RegisterResult? _result;
  bool _copied = false;

  String? _ticket;
  GoogleSignupInfo? _google;
  String? _googleError;

  @override
  void initState() {
    super.initState();
    final t = widget.googleTicket;
    if (t != null && t.contains('.')) _loadGoogle(t);
  }

  Future<void> _loadGoogle(String ticket) async {
    try {
      final info = await ref.read(registerRepositoryProvider).googleSignupInfo(ticket);
      if (!mounted) return;
      setState(() {
        _ticket = ticket;
        _google = info;
        if (_lastName.text.isEmpty) _lastName.text = info.lastName;
        if (_firstName.text.isEmpty) _firstName.text = info.firstName;
      });
    } on ApiError catch (e) {
      if (mounted) setState(() => _googleError = e.message);
    }
  }

  @override
  void dispose() {
    _lastName.dispose();
    _firstName.dispose();
    _phone.dispose();
    _school.dispose();
    _code.dispose();
    super.dispose();
  }

  void _clearError(String key) {
    if (_errors.containsKey(key)) setState(() => _errors = {..._errors}..remove(key));
  }

  Future<void> _submit() async {
    final kind = _kind;
    if (kind == null || _loading) return;
    final errors = validateRegister(
      kind: kind,
      lastName: _lastName.text,
      firstName: _firstName.text,
      phone: _phone.text.trim(),
      activationCode: _code.text.trim(),
      subjects: _subjects,
    );
    setState(() {
      _errors = errors;
      _submitError = null;
    });
    if (errors.isNotEmpty) return;
    if (!_consent.ready) {
      setState(() => _submitError = 'Нөхцөл, насны ангилал болон зөвшөөрлөө сонгоно уу');
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await ref.read(registerRepositoryProvider).register(
            RegisterForm(
              kind: kind,
              lastName: _lastName.text,
              firstName: _firstName.text,
              phone: _phone.text.trim(),
              grade: _grade,
              school: _school.text,
              activationCode: _code.text.trim(),
              subjects: _subjects,
              isMinor: _consent.isMinor!,
              guardianConsent: _consent.guardianConsent,
              googleTicket: _ticket,
            ),
          );
      if (!mounted) return;
      if (kind.isStudent && res.studentCode != null) {
        // Сурагчийн кодыг яг үүссэн мөчид онцолж харуулна; нэвтрэлтийг «Үргэлжлүүлэх»-ээр.
        setState(() => _result = res);
      } else {
        await _signIn(res);
      }
    } on ApiError catch (e) {
      if (mounted) setState(() => _submitError = e.message);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// Нэвтэрмэгц router `?next=` эсвэл role-ийн нүүр рүү шилжүүлнэ.
  Future<void> _signIn(RegisterResult r) => ref
      .read(sessionProvider.notifier)
      .signIn(token: r.accessToken, userId: r.userId, role: r.role, remember: true);

  Future<void> _copy() async {
    final code = _result?.studentCode;
    if (code == null) return;
    await Clipboard.setData(ClipboardData(text: code));
    if (mounted) setState(() => _copied = true);
  }

  @override
  Widget build(BuildContext context) {
    final result = _result;
    return AuthScaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Бүртгэл үүсгэх')),
      child: result != null ? _codeView(result) : _form(context),
    );
  }

  Widget _codeView(RegisterResult r) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(AppIcons.success, size: 18, color: context.colors.success),
              const SizedBox(width: AppSpace.xs),
              Flexible(
                child: Text(
                  'Бүртгэл амжилттай үүслээ',
                  style: context.text.labelLarge?.copyWith(color: context.colors.success),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          Text('Таны сурагчийн код', style: context.text.titleMedium, textAlign: TextAlign.center),
          const SizedBox(height: AppSpace.xs),
          Text(
            'Энэ бол таны сургалтын төв дэх байнгын танигдах код. Шалгалт, дэвтэр, гэрчилгээ бүх газар энэ кодоор '
            'тань таних тул хадгалж авна уу',
            style: context.text.bodySmall,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpace.lg),
          Container(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.lg),
            decoration: BoxDecoration(
              color: context.colors.surfaceSunken,
              borderRadius: BorderRadius.circular(AppRadius.md),
            ),
            child: SelectableText(
              r.studentCode!,
              textAlign: TextAlign.center,
              style: context.text.headlineSmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 2),
            ),
          ),
          const SizedBox(height: AppSpace.md),
          OutlinedButton.icon(
            onPressed: _copied ? null : _copy,
            icon: Icon(_copied ? AppIcons.check : AppIcons.copy, size: 18),
            label: Text(_copied ? 'Хуулагдлаа' : 'Кодыг хуулах'),
          ),
          const SizedBox(height: AppSpace.sm),
          FilledButton(onPressed: () => _signIn(r), child: const Text('Үргэлжлүүлэх')),
        ],
      ),
    );
  }

  Widget _form(BuildContext context) {
    final kind = _kind;
    final windows = ref.watch(enrollmentWindowsProvider).value;
    final onlineOpen = windows?.any((w) => w.centreOnlineClassEnabled) ?? false;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_google != null) ...[
          AppCard(
            accent: context.colors.brand,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Gmail: ${_google!.email}', style: context.text.titleSmall),
                const SizedBox(height: AppSpace.xs),
                Text('Бүртгүүлсний дараа энэ Gmail-ээр нэвтэрнэ. Утасны дугаар заавал, анхны нууц үг тань утасны дугаар '
                    'байна', style: context.text.bodySmall),
                TextButton(
                  onPressed: () => setState(() {
                    _ticket = null;
                    _google = null;
                  }),
                  child: const Text('Gmail-гүйгээр бүртгүүлэх'),
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.lg),
        ],
        if (_googleError != null && _google == null) ...[
          FormMessage(message: _googleError),
          const SizedBox(height: AppSpace.lg),
        ],
        Row(
          children: [
            Expanded(child: Text('1. Та хэн бэ?', style: context.text.titleSmall)),
            if (kind != null)
              TextButton(
                onPressed: _loading ? null : () => setState(() => _kind = null),
                child: const Text('Өөрчлөх'),
              ),
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        if (kind != null)
          AppCard(
            accent: context.colors.brand,
            child: Text(kind.title, style: context.text.titleSmall),
          )
        else
          for (final k in RegisterKind.values) ...[
            _KindCard(
              kind: k,
              disabled: k == RegisterKind.online && !onlineOpen,
              onTap: () => setState(() {
                _kind = k;
                _subjects.clear();
                _explain = null;
                _errors = const {};
              }),
            ),
            const SizedBox(height: AppSpace.sm),
          ],
        if (kind != null) ...[
          const SizedBox(height: AppSpace.lg),
          Text('2. Мэдээллээ бөглөнө үү', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.md),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: TextField(
                  controller: _lastName,
                  enabled: !_loading,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.familyName],
                  onChanged: (_) => _clearError('lastName'),
                  decoration: InputDecoration(labelText: 'Овог', errorText: _errors['lastName']),
                ),
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: TextField(
                  controller: _firstName,
                  enabled: !_loading,
                  textInputAction: TextInputAction.next,
                  autofillHints: const [AutofillHints.givenName],
                  onChanged: (_) => _clearError('firstName'),
                  decoration: InputDecoration(labelText: 'Нэр', errorText: _errors['firstName']),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: _phone,
            enabled: !_loading,
            keyboardType: TextInputType.phone,
            autofillHints: const [AutofillHints.telephoneNumber],
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(8)],
            onChanged: (_) => _clearError('phone'),
            decoration: InputDecoration(
              labelText: 'Утасны дугаар',
              hintText: '99112233',
              helperText: 'Эхний нууц үг тань энэ утасны дугаар байна. Нэвтэрсний дараа өөрчилж болно',
              helperMaxLines: 2,
              errorText: _errors['phone'],
            ),
          ),
          if (kind.isStudent) ...[
            const SizedBox(height: AppSpace.md),
            DropdownButtonFormField<int>(
              initialValue: _grade,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Анги'),
              items: [for (final g in const [9, 10, 11, 12]) DropdownMenuItem(value: g, child: Text('$g-р анги'))],
              onChanged: _loading ? null : (g) => setState(() => _grade = g ?? _grade),
            ),
            const SizedBox(height: AppSpace.md),
            TextField(
              controller: _school,
              enabled: !_loading,
              decoration: const InputDecoration(labelText: 'Сургууль', helperText: 'Заавал биш'),
            ),
            const SizedBox(height: AppSpace.lg),
            _SubjectPicker(
              windows: windows,
              kind: kind,
              selected: _subjects,
              explain: _explain,
              error: _errors['subjects'],
              onToggle: (w) => setState(() {
                if (subjectLockReason(w, kind) != null) {
                  _explain = w.subject;
                  return;
                }
                _explain = null;
                if (!_subjects.remove(w.subject)) _subjects.add(w.subject);
                _errors = {..._errors}..remove('subjects');
              }),
            ),
          ],
          if (kind == RegisterKind.classroom) ...[
            const SizedBox(height: AppSpace.lg),
            TextField(
              controller: _code,
              enabled: !_loading,
              keyboardType: TextInputType.number,
              inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(8)],
              onChanged: (_) => _clearError('activationCode'),
              decoration: InputDecoration(
                labelText: 'Багшаас авсан өнөөдрийн код',
                hintText: '20260726',
                helperText: 'Танхимын ангид бүртгүүлэхэд багшаас өнөөдрийн 8 оронтой кодыг авна',
                helperMaxLines: 2,
                errorText: _errors['activationCode'],
              ),
            ),
          ],
          const SizedBox(height: AppSpace.lg),
          ConsentFields(value: _consent, enabled: !_loading, onChanged: (v) => setState(() => _consent = v)),
          const SizedBox(height: AppSpace.md),
          FormMessage(message: _submitError),
          const SizedBox(height: AppSpace.md),
          FilledButton(
            onPressed: _loading || !_consent.ready ? null : _submit,
            child: _loading ? const ButtonProgress() : const Text('Бүртгүүлэх'),
          ),
        ],
        const SizedBox(height: AppSpace.xl),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text('Бүртгэлтэй юу?', style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
            TextButton(onPressed: () => context.go('/login'), child: const Text('Нэвтрэх')),
          ],
        ),
        TextButton(
          onPressed: () => context.push('/teacher-register'),
          child: const Text('Ангиа удирдах багш уу? Багшаар бүртгүүлэх'),
        ),
      ],
    );
  }
}

class _KindCard extends StatelessWidget {
  const _KindCard({required this.kind, required this.disabled, required this.onTap});

  final RegisterKind kind;
  final bool disabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final dim = context.colors.inkDim;
    return AppCard(
      onTap: disabled ? null : onTap,
      semanticLabel: kind.title,
      child: Row(
        children: [
          Icon(disabled ? AppIcons.ban : AppIcons.circle, size: 20, color: disabled ? dim : context.colors.brand),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(kind.title, style: context.text.titleSmall?.copyWith(color: disabled ? dim : null)),
                const SizedBox(height: 2),
                Text(
                  disabled ? onlineClosedText : kind.description,
                  style: context.text.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SubjectPicker extends StatelessWidget {
  const _SubjectPicker({
    required this.windows,
    required this.kind,
    required this.selected,
    required this.explain,
    required this.error,
    required this.onToggle,
  });

  final List<EnrollmentWindow>? windows;
  final RegisterKind kind;
  final Set<RegisterSubject> selected;
  final RegisterSubject? explain;
  final String? error;
  final ValueChanged<EnrollmentWindow> onToggle;

  String _status(EnrollmentWindow w) {
    if (kind == RegisterKind.online && !w.centreOnlineClassEnabled) return 'онлайн анги нээгдээгүй';
    return switch (w.status) {
      'OPEN' => 'сонгох боломжтой',
      'COMING_SOON' => 'Удахгүй',
      _ => 'Элсэлт одоогоор дууссан',
    };
  }

  @override
  Widget build(BuildContext context) {
    final list = windows;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Ямар хичээлээр суралцах вэ?', style: context.text.labelLarge),
        const SizedBox(height: AppSpace.sm),
        if (list == null)
          const SkeletonBox(height: 56)
        else
          for (final s in RegisterSubject.values)
            if (list.where((w) => w.subject == s).firstOrNull case final w?) ...[
              Builder(
                builder: (context) {
                  final reason = subjectLockReason(w, kind);
                  return Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      AppCard(
                        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: AppSpace.xs),
                        accent: selected.contains(s) ? context.colors.brand : null,
                        child: Row(
                          children: [
                            Checkbox(
                              value: selected.contains(s),
                              semanticLabel: s.label,
                              onChanged: (_) => onToggle(w),
                            ),
                            Expanded(
                              child: GestureDetector(
                                behavior: HitTestBehavior.opaque,
                                onTap: () => onToggle(w),
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        w.classroomOnly ? '${s.label} (зөвхөн танхимын анги)' : s.label,
                                        style: context.text.titleSmall?.copyWith(
                                          color: reason != null ? context.colors.inkDim : null,
                                        ),
                                      ),
                                      Text(_status(w), style: context.text.bodySmall),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (reason != null && explain == s)
                        Padding(
                          padding: const EdgeInsets.only(top: AppSpace.xs),
                          child: Semantics(
                            liveRegion: true,
                            child: Text(reason, style: context.text.bodySmall),
                          ),
                        ),
                      const SizedBox(height: AppSpace.sm),
                    ],
                  );
                },
              ),
            ],
        if (error != null)
          Text(error!, style: context.text.bodySmall?.copyWith(color: context.colors.error))
        else
          Text(
            selected.isEmpty ? 'Энэ сонголт таны сурагчийн кодод тусгагдана' : '${selected.length} хичээл сонгосон',
            style: context.text.bodySmall,
          ),
      ],
    );
  }
}
