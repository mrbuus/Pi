import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/teacher_providers.dart';
import '../data/teacher_repository.dart';
import '../data/teacher_today.dart';
import 'teacher_widgets.dart';

/// Сурагчийн «Мэдээлэл» таб: хувийн мэдээлэл, «Ангийн түүх» (анги солигдсон ч бүх хугацаа).
/// «Засах» товч зөвхөн эрхтэй (Багш+ сурагчийг, Админ бүгдийг) хүнд; эцсийн шийдвэр серверт (403 тайван харагдана).
class StudentInfoTab extends ConsumerWidget {
  const StudentInfoTab({super.key, required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(studentDetailProvider(studentId));
    return async.when(
      skipLoadingOnRefresh: false,
      loading: () => const LoadingState(cards: 2),
      error: (e, _) => ErrorState(
        message: errorText(e, 'Сурагчийн мэдээлэл нээгдсэнгүй'),
        onRetry: () => ref.invalidate(studentDetailProvider(studentId)),
      ),
      data: (d) => _Body(detail: d),
    );
  }
}

class _Body extends ConsumerStatefulWidget {
  const _Body({required this.detail});

  final StudentDetail detail;

  @override
  ConsumerState<_Body> createState() => _BodyState();
}

class _BodyState extends ConsumerState<_Body> {
  String? _saved;

  Future<void> _edit(String viewerRole) async {
    final msg = await ProfileEditSheet.open(context, detail: widget.detail, showGuardians: canSeeGuardianPhones(viewerRole));
    if (msg != null && mounted) setState(() => _saved = msg);
  }

  @override
  Widget build(BuildContext context) {
    final d = widget.detail;
    final session = ref.watch(sessionProvider);
    final viewerRole = session is SignedIn ? session.role.apiValue : null;
    final canEdit = canEditProfile(viewerRole, d.role);
    final showGuardians = canSeeGuardianPhones(viewerRole);
    final c = context.colors;
    final history = d.classHistory.reversed.toList();
    return RefreshIndicator(
      onRefresh: () => ref.refresh(studentDetailProvider(d.id).future).then((_) {}, onError: (_) {}),
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          Row(
            children: [
              Expanded(child: Text('Хувийн мэдээлэл', style: context.text.titleSmall)),
              if (canEdit)
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(minimumSize: const Size(120, teacherTap)),
                  onPressed: () => _edit(viewerRole!),
                  icon: const Icon(AppIcons.draft, size: 18),
                  label: const Text('Засах'),
                ),
            ],
          ),
          if (_saved != null) ...[
            const SizedBox(height: AppSpace.xs),
            Text(_saved!, style: context.text.bodySmall?.copyWith(color: c.success)),
          ],
          const SizedBox(height: AppSpace.sm),
          AppCard(
            padding: EdgeInsets.zero,
            child: Column(
              children: [
                for (final (i, r) in [
                  ('Нэр', [d.firstName, d.lastName].where((x) => x.trim().isNotEmpty).join(' ')),
                  ('Код', d.studentCode),
                  ('Утас', d.phone),
                  ('Имэйл', d.email),
                  ('Анги', d.grade == null ? null : '${d.grade}-р анги'),
                  ('Сургууль', d.school),
                  if (showGuardians) ...[
                    ('Эцгийн утас', d.fatherPhone),
                    ('Эхийн утас', d.motherPhone),
                    ('Эцэг эхийн тэмдэглэл', d.guardianNote),
                  ],
                ].where((r) => r.$2 != null && r.$2!.trim().isNotEmpty).indexed) ...[
                  if (i > 0) Divider(height: 1, color: c.line),
                  _InfoRow(label: r.$1, value: r.$2!),
                ],
              ],
            ),
          ),
          const SizedBox(height: AppSpace.lg),
          Row(
            children: [
              Icon(AppIcons.historyLog, size: 18, color: c.inkDim),
              const SizedBox(width: AppSpace.sm),
              Text('Ангийн түүх', style: context.text.titleSmall),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          if (history.isEmpty)
            const AppCard(child: EmptyState(icon: AppIcons.students, title: 'Ангийн түүх алга'))
          else
            AppCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (final (i, h) in history.indexed) ...[
                    if (i > 0) Divider(height: 1, color: c.line),
                    _HistoryRow(row: h),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(label, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
        ),
        Expanded(child: Text(value, style: context.text.bodyMedium)),
      ],
    ),
  );
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({required this.row});

  final ClassHistoryRow row;

  static String _day(DateTime? t) => t == null ? '' : DateMn.numeric(UbDateTime.fromInstant(t));

  @override
  Widget build(BuildContext context) {
    final from = _day(row.joined);
    final to = row.leftAt == null ? 'одоог хүртэл' : _day(row.left);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(row.shortName, style: context.text.titleSmall),
          const SizedBox(height: AppSpace.xs),
          Meta(
            style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
            items: [if (from.isNotEmpty) '$from – $to', 'ирц ${row.attendance}', 'даалгавар ${row.homework}'],
          ),
        ],
      ),
    );
  }
}

/// Профайл засах хуудас. Өөрчилсөн талбарыг л илгээнэ (вэбтэй ижил). Утас солигдвол сурагчийн нууц үг
/// утсыг дагах эсэхийг СЕРВЕР шийднэ — хариуг нь харуулна. Амжилттай бол хадгалсан мэдэгдлийг буцаана.
class ProfileEditSheet extends ConsumerStatefulWidget {
  const ProfileEditSheet({super.key, required this.detail, required this.showGuardians});

  final StudentDetail detail;
  final bool showGuardians;

  static Future<String?> open(BuildContext context, {required StudentDetail detail, required bool showGuardians}) =>
      showModalBottomSheet<String>(
        context: context,
        isScrollControlled: true,
        showDragHandle: true,
        builder: (_) => ProfileEditSheet(detail: detail, showGuardians: showGuardians),
      );

  /// Өөрчлөгдсөн талбарууд ({} = өөрчлөлт алга). Хоосон утга илгээхгүй (сервер хоосон нэр/утсыг хүлээн авахгүй).
  static Map<String, Object?> buildPatch(
    StudentDetail d, {
    required String firstName,
    required String lastName,
    required String phone,
    required String email,
    required String grade,
    required String school,
    required String fatherPhone,
    required String motherPhone,
    required String guardianNote,
    required bool guardians,
  }) {
    final body = <String, Object?>{};
    void text(String key, String next, String? prev, {bool allowClear = false}) {
      final v = next.trim();
      if (v == (prev ?? '')) return;
      if (v.isEmpty && !allowClear) return;
      body[key] = v;
    }

    text('firstName', firstName, d.firstName);
    text('lastName', lastName, d.lastName);
    text('phone', phone, d.phone);
    text('email', email, d.email);
    text('school', school, d.school, allowClear: true);
    final g = int.tryParse(grade.trim());
    if (g != null && g != d.grade) body['grade'] = g;
    if (guardians) {
      text('fatherPhone', fatherPhone, d.fatherPhone);
      text('motherPhone', motherPhone, d.motherPhone);
      text('guardianNote', guardianNote, d.guardianNote, allowClear: true);
    }
    return body;
  }

  @override
  ConsumerState<ProfileEditSheet> createState() => _ProfileEditSheetState();
}

class _ProfileEditSheetState extends ConsumerState<ProfileEditSheet> {
  late final _first = TextEditingController(text: widget.detail.firstName);
  late final _last = TextEditingController(text: widget.detail.lastName);
  late final _phone = TextEditingController(text: widget.detail.phone ?? '');
  late final _email = TextEditingController(text: widget.detail.email ?? '');
  late final _grade = TextEditingController(text: widget.detail.grade?.toString() ?? '');
  late final _school = TextEditingController(text: widget.detail.school ?? '');
  late final _father = TextEditingController(text: widget.detail.fatherPhone ?? '');
  late final _mother = TextEditingController(text: widget.detail.motherPhone ?? '');
  late final _note = TextEditingController(text: widget.detail.guardianNote ?? '');
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    for (final c in [_first, _last, _phone, _email, _grade, _school, _father, _mother, _note]) {
      c.dispose();
    }
    super.dispose();
  }

  static final _eight = RegExp(r'^\d{8}$');

  String? _validate(Map<String, Object?> body) {
    for (final (key, label) in [('phone', 'Утасны дугаар'), ('fatherPhone', 'Эцгийн утас'), ('motherPhone', 'Эхийн утас')]) {
      final v = body[key];
      if (v is String && !_eight.hasMatch(v)) return '$label 8 оронтой байх ёстой';
    }
    final g = body['grade'];
    if (g is int && (g < 1 || g > 12)) return 'Анги 1-ээс 12 хооронд байна';
    final email = body['email'];
    if (email is String && !email.contains('@')) return 'Имэйл хаяг буруу байна';
    return null;
  }

  Future<void> _save() async {
    if (_busy) return;
    final body = ProfileEditSheet.buildPatch(
      widget.detail,
      firstName: _first.text,
      lastName: _last.text,
      phone: _phone.text,
      email: _email.text,
      grade: _grade.text,
      school: _school.text,
      fatherPhone: _father.text,
      motherPhone: _mother.text,
      guardianNote: _note.text,
      guardians: widget.showGuardians,
    );
    if (body.isEmpty) {
      Navigator.pop(context);
      return;
    }
    final invalid = _validate(body);
    if (invalid != null) {
      setState(() => _error = invalid);
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final res = await ref.read(teacherRepositoryProvider).updateProfile(widget.detail.id, body);
      ref.invalidate(studentDetailProvider(widget.detail.id));
      if (!mounted) return;
      final pw = !body.containsKey('phone')
          ? ''
          : res.passwordFollowedPhone == true
          ? '. Нууц үг шинэ дугаар боллоо'
          : '. Нууц үгээ өөрөө сольсон тул хэвээр';
      Navigator.pop(context, 'Хадгалагдлаа$pw');
    } catch (e) {
      if (!mounted) return;
      // 403 (эрхгүй) эвдрэл биш: серверийн монгол мессежийг тайван харуулна.
      setState(() {
        _busy = false;
        _error = e is ApiError && e.message.trim().isNotEmpty ? e.message : 'Хадгалагдсангүй. Дахин оролдоно уу.';
      });
    }
  }

  Widget _field(TextEditingController c, String label, {TextInputType? type, int? maxLength, int maxLines = 1, bool digits = false}) =>
      Padding(
        padding: const EdgeInsets.only(bottom: AppSpace.md),
        child: TextField(
          controller: c,
          keyboardType: type,
          maxLength: maxLength,
          maxLines: maxLines,
          inputFormatters: digits ? [FilteringTextInputFormatter.digitsOnly] : null,
          decoration: InputDecoration(labelText: label, counterText: ''),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, MediaQuery.viewInsetsOf(context).bottom + AppSpace.lg),
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Мэдээлэл засах', style: context.text.titleMedium),
              const SizedBox(height: AppSpace.md),
              _field(_first, 'Нэр'),
              _field(_last, 'Овог'),
              _field(_phone, 'Утасны дугаар', type: TextInputType.phone, maxLength: 8, digits: true),
              _field(_email, 'Имэйл', type: TextInputType.emailAddress),
              _field(_grade, 'Анги', type: TextInputType.number, maxLength: 2, digits: true),
              _field(_school, 'Сургууль'),
              if (widget.showGuardians) ...[
                _field(_father, 'Эцгийн утас', type: TextInputType.phone, maxLength: 8, digits: true),
                _field(_mother, 'Эхийн утас', type: TextInputType.phone, maxLength: 8, digits: true),
                _field(_note, 'Эцэг эхийн тэмдэглэл', maxLines: 3),
              ],
              if (_error != null) ...[
                Text(_error!, style: context.text.bodySmall?.copyWith(color: c.error)),
                const SizedBox(height: AppSpace.sm),
              ],
              FilledButton(
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                onPressed: _busy ? null : _save,
                child: Text(_busy ? 'Хадгалж байна' : AppStrings.save),
              ),
              const SizedBox(height: AppSpace.sm),
              TextButton(
                style: TextButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
                onPressed: _busy ? null : () => Navigator.pop(context),
                child: const Text(AppStrings.cancel),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
