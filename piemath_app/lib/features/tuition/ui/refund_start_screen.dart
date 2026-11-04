import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../application/tuition_providers.dart';
import '../data/tuition_models.dart';
import '../data/tuition_repository.dart';
import 'refund_widgets.dart';

/// `/app/tuition` — буцаалтын тооцоо (вэбийн `tuition/page.tsx` + `RefundCalculator`).
///
/// Сурагч хайх → идэвхтэй анги → гарсан огноо → серверийн тооцоо (`/tuition/refund/preview`) →
/// дүнг бичсэн баталгаажуулалт → ноорог (`POST /tuition/refund`). Мөнгийг апп тооцохгүй.
class RefundStartScreen extends StatelessWidget {
  const RefundStartScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Сургалтын төлбөр')),
      body: TuitionGate(builder: (_, _) => const RefundStartBody()),
    );
  }
}

/// [RefundStartScreen]-ийн бие (эрх шалгасны дараа).
class RefundStartBody extends ConsumerStatefulWidget {
  const RefundStartBody({super.key});

  @override
  ConsumerState<RefundStartBody> createState() => _RefundStartBodyState();
}

class _RefundStartBodyState extends ConsumerState<RefundStartBody> {
  final _query = TextEditingController();
  Timer? _debounce;
  int _searchSeq = 0;
  int _studentSeq = 0;
  int _previewSeq = 0;

  List<StudentHit> _hits = const [];
  bool _searching = false;
  String? _searchError;

  StudentHit? _student;
  RefundClassroom? _classroom;
  bool _studentLoading = false;
  String? _studentError;

  late UbDateTime _leftOn = ref.read(tuitionTodayProvider).startOfDay;

  RefundPreview? _preview;
  String? _previewKey;
  bool _calculating = false;
  String? _error;

  /// Давхар дарахаас хамгаалалт — баталгаажуулах цонх нээгдэхээс өмнө синхроноор тавигдана.
  bool _saving = false;

  TuitionRepository get _repo => ref.read(tuitionRepositoryProvider);

  String get _selectionKey => '${_student?.id}|${_classroom?.id}|${_leftOn.dateKey}';

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _clearPreview() {
    _previewSeq++;
    _preview = null;
    _previewKey = null;
    _calculating = false;
  }

  void _onQuery(String value) {
    _debounce?.cancel();
    final term = value.trim();
    if (term.length < 2) {
      _searchSeq++;
      setState(() {
        _hits = const [];
        _searching = false;
        _searchError = null;
      });
      return;
    }
    _debounce = Timer(const Duration(milliseconds: 300), () => _search(term));
  }

  Future<void> _search(String term) async {
    final seq = ++_searchSeq;
    setState(() {
      _searching = true;
      _searchError = null;
    });
    try {
      final hits = await _repo.searchStudents(term);
      if (!mounted || seq != _searchSeq) return;
      setState(() => _hits = hits);
    } catch (_) {
      if (!mounted || seq != _searchSeq) return;
      setState(() {
        _hits = const [];
        _searchError = 'Сурагч хайж чадсангүй. Дахин оролдоно уу';
      });
    } finally {
      if (mounted && seq == _searchSeq) setState(() => _searching = false);
    }
  }

  Future<void> _choose(StudentHit hit) async {
    final seq = ++_studentSeq;
    _debounce?.cancel();
    _searchSeq++;
    _query.clear();
    setState(() {
      _student = hit;
      _classroom = null;
      _hits = const [];
      _searching = false;
      _searchError = null;
      _studentError = null;
      _studentLoading = true;
      _error = null;
      _clearPreview();
    });
    try {
      final info = await _repo.studentClass(hit.id);
      if (!mounted || seq != _studentSeq) return;
      setState(() {
        if (!info.isStudent) {
          _studentError = 'Сурагчийн бүртгэл сонгоно уу';
        } else if (info.classroom == null) {
          _studentError = 'Энэ сурагчийн идэвхтэй анги олдсонгүй. Ангиа шалгана уу';
        } else {
          _classroom = info.classroom;
        }
      });
    } catch (_) {
      if (mounted && seq == _studentSeq) {
        setState(() => _studentError = 'Сурагчийн мэдээлэл авч чадсангүй. Дахин оролдоно уу');
      }
    } finally {
      if (mounted && seq == _studentSeq) setState(() => _studentLoading = false);
    }
  }

  void _clearStudent() {
    _studentSeq++;
    setState(() {
      _student = null;
      _classroom = null;
      _studentLoading = false;
      _studentError = null;
      _error = null;
      _clearPreview();
    });
  }

  Future<void> _pickDate() async {
    final today = ref.read(tuitionTodayProvider).startOfDay;
    final first = today.addDays(-730);
    DateTime local(UbDateTime d) => DateTime(d.year, d.month, d.day);
    final picked = await showDatePicker(
      context: context,
      initialDate: local(_leftOn.compareTo(today) > 0 ? today : _leftOn),
      firstDate: local(first),
      // Сервер ирээдүйн огноог татгалздаг.
      lastDate: local(today),
      currentDate: local(today),
      helpText: 'Ангиас гарсан огноо',
      cancelText: AppStrings.cancel,
      confirmText: 'Сонгох',
    );
    if (picked == null || !mounted) return;
    final day = UbDateTime(picked.year, picked.month, picked.day);
    if (day == _leftOn) return;
    setState(() {
      _leftOn = day;
      _error = null;
      _clearPreview();
    });
  }

  bool get _canCalculate => _student != null && _classroom != null && !_studentLoading && !_calculating && !_saving;

  Future<void> _calculate() async {
    final student = _student;
    final classroom = _classroom;
    if (student == null || classroom == null) return;
    final seq = ++_previewSeq;
    final key = _selectionKey;
    setState(() {
      _calculating = true;
      _error = null;
      _preview = null;
      _previewKey = null;
    });
    try {
      final p = await _repo.preview(studentId: student.id, classroomId: classroom.id, leftOn: _leftOn.dateKey);
      if (!mounted || seq != _previewSeq) return;
      setState(() {
        _preview = p;
        _previewKey = key;
      });
    } on ApiError catch (e) {
      if (mounted && seq == _previewSeq) setState(() => _error = e.message);
    } catch (_) {
      if (mounted && seq == _previewSeq) setState(() => _error = 'Буцаалтын тооцоо хийж чадсангүй. Дахин оролдоно уу');
    } finally {
      if (mounted && seq == _previewSeq) setState(() => _calculating = false);
    }
  }

  Future<void> _save() async {
    final p = _preview;
    final student = _student;
    final classroom = _classroom;
    // Тооцоо одоогийн сонголттой таарахгүй бол (огноо солигдсон гэх мэт) хадгалахгүй.
    if (_saving || p == null || student == null || classroom == null || _previewKey != _selectionKey) return;
    setState(() => _saving = true);
    final leftOn = _leftOn.dateKey;
    final ok = await confirmAction(
      context,
      title: 'Буцаалтын ноорог хадгалах уу',
      message: [
        '${p.student.fullName}, ${p.classroom.name}',
        'Гарсан өдөр: ${refundDay(p.leftOn)}',
        'Буцаах дүн: ${formatMnt(p.calculation.refundAmount)}',
      ].join('\n'),
      confirmLabel: 'Хадгалах',
      destructive: false,
    );
    if (!mounted) return;
    if (!ok) {
      setState(() => _saving = false);
      return;
    }
    try {
      final created = await _repo.create(studentId: student.id, classroomId: classroom.id, leftOn: leftOn);
      if (!mounted) return;
      _clearStudent();
      if (created.existed) {
        ScaffoldMessenger.maybeOf(context)
            ?.showSnackBar(const SnackBar(content: Text('Энэ сурагчийн буцаалт өмнө бүртгэгдсэн байна')));
      }
      unawaited(context.push('/app/tuition/refund/${Uri.encodeComponent(created.id)}'));
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) setState(() => _error = 'Буцаалт үүсгэж чадсангүй. Мэдээллээ шалгаад дахин оролдоно уу');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final p = _preview;
    final fresh = p != null && _previewKey == _selectionKey;
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        AppCard(
          onTap: () => context.push('/app/tuition/refunds'),
          semanticLabel: 'Буцаалтын жагсаалт',
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: AppSizes.minTap - AppSpace.lg),
            child: Row(
              children: [
                Icon(AppIcons.receipt, color: context.colors.brand),
                const SizedBox(width: AppSpace.md),
                Expanded(child: Text('Буцаалтын жагсаалт', style: context.text.titleSmall)),
                Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
              ],
            ),
          ),
        ),
        const SectionHeader(title: 'Сурагч, гарсан өдөр'),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              if (_student == null) ..._searchSection(context) else _selectedStudent(context),
              if (_studentLoading) ...[
                const SizedBox(height: AppSpace.md),
                const SkeletonPulse(child: SkeletonRows(rows: 1)),
              ],
              if (_studentError != null) ...[
                const SizedBox(height: AppSpace.md),
                _ErrorLine(message: _studentError!, onRetry: _student == null ? null : () => _choose(_student!)),
              ],
              if (_classroom != null) ...[
                const SizedBox(height: AppSpace.md),
                _FieldTile(
                  icon: AppIcons.classes,
                  label: 'Идэвхтэй анги',
                  value: _classroom!.grade == null
                      ? _classroom!.name
                      : '${_classroom!.name}, ${_classroom!.grade}-р анги',
                ),
              ],
              const SizedBox(height: AppSpace.md),
              _FieldTile(
                key: const Key('refund-left-on'),
                icon: AppIcons.calendar,
                label: 'Ангиас гарсан огноо',
                value: '${DateMn.numeric(_leftOn)}, ${weekdayNameMn(_leftOn.weekday)}',
                onTap: _calculating || _saving ? null : _pickDate,
              ),
              const SizedBox(height: AppSpace.lg),
              FilledButton.icon(
                key: const Key('refund-calc'),
                onPressed: _canCalculate ? _calculate : null,
                style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                icon: const Icon(AppIcons.chart, size: 18),
                label: Text(_calculating ? 'Тооцож байна' : 'Тооцоог харах'),
              ),
            ],
          ),
        ),
        if (_error != null) ...[
          const SizedBox(height: AppSpace.md),
          _ErrorLine(message: _error!, onRetry: fresh || _canCalculate ? _calculate : null),
        ],
        if (fresh) ...[
          const SectionHeader(
            title: 'Тооцоо',
            trailing: InfoHint(
              title: 'Эхлээд ноорог болно',
              message: 'Буцаалт ноорог байдлаар хадгалагдана. Зөвшөөрөгдөж, олгосны дараа төлөв шинэчлэгдэнэ',
            ),
          ),
          RefundPreviewView(preview: p),
          const SizedBox(height: AppSpace.lg),
          FilledButton.icon(
            key: const Key('refund-save'),
            onPressed: _saving || _calculating || _studentLoading ? null : _save,
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
            icon: const Icon(AppIcons.save, size: 18),
            label: Text(_saving ? 'Хадгалж байна' : 'Буцаалтын ноорог хадгалах'),
          ),
        ],
      ],
    );
  }

  List<Widget> _searchSection(BuildContext context) {
    final term = _query.text.trim();
    return [
      TextField(
        key: const Key('refund-search'),
        controller: _query,
        onChanged: _onQuery,
        textInputAction: TextInputAction.search,
        decoration: const InputDecoration(
          labelText: 'Сурагч хайх',
          hintText: 'Нэр эсвэл сурагчийн кодоор',
          helperText: 'Хоёр ба түүнээс олон үсэг оруулна уу',
          prefixIcon: Icon(AppIcons.search),
        ),
      ),
      if (_searching) ...[const SizedBox(height: AppSpace.md), const SkeletonPulse(child: SkeletonRows(rows: 2))],
      if (_searchError != null) ...[
        const SizedBox(height: AppSpace.md),
        _ErrorLine(message: _searchError!, onRetry: () => _search(term)),
      ],
      if (!_searching && _searchError == null && term.length >= 2 && _hits.isEmpty && _searchSeq > 0)
        Padding(
          padding: const EdgeInsets.only(top: AppSpace.md),
          child: Text(
            'Ийм сурагч олдсонгүй. Нэр эсвэл кодоо шалгана уу',
            style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
          ),
        ),
      for (final h in _hits)
        InkWell(
          onTap: () => _choose(h),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: AppSizes.minTap),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
              child: Row(
                children: [
                  Expanded(child: Text(h.fullName, style: context.text.titleSmall)),
                  if (h.code != null)
                    Text(h.code!, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
                ],
              ),
            ),
          ),
        ),
    ];
  }

  Widget _selectedStudent(BuildContext context) {
    final s = _student!;
    return Row(
      children: [
        DetailAvatar(initials: DetailAvatar.initialsOf(s.fullName), size: 40),
        const SizedBox(width: AppSpace.md),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(s.fullName, style: context.text.titleSmall),
              Text(s.code ?? 'Сурагч', style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
            ],
          ),
        ),
        IconButton(
          tooltip: 'Сурагчийн сонголтыг арилгах',
          onPressed: _saving ? null : _clearStudent,
          icon: const Icon(AppIcons.close),
        ),
      ],
    );
  }
}

class _FieldTile extends StatelessWidget {
  const _FieldTile({super.key, required this.icon, required this.label, required this.value, this.onTap});

  final IconData icon;
  final String label;
  final String value;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: c.surfaceSunken,
      borderRadius: BorderRadius.circular(AppRadius.md),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: AppSizes.minTap + AppSpace.md),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
            child: Row(
              children: [
                Icon(icon, size: 20, color: c.brand),
                const SizedBox(width: AppSpace.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(label, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                      Text(value, style: context.text.titleSmall),
                    ],
                  ),
                ),
                if (onTap != null) Icon(AppIcons.expand, size: 18, color: c.inkDim),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ErrorLine extends StatelessWidget {
  const _ErrorLine({required this.message, this.onRetry});

  final String message;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      liveRegion: true,
      child: Row(
        children: [
          Icon(AppIcons.error, size: 18, color: c.error),
          const SizedBox(width: AppSpace.sm),
          Expanded(child: Text(message, style: context.text.bodyMedium)),
          if (onRetry != null) TextButton(onPressed: onRetry, child: const Text(AppStrings.retry)),
        ],
      ),
    );
  }
}
