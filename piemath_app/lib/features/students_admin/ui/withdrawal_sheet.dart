import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/money.dart';
import '../data/students_admin_models.dart';
import '../data/students_admin_repository.dart';
import 'student_actions.dart' show archiveReasons;

/// «Сургалтаас хасах» (вэбийн `RemoveFromTrainingDialog`, эзэн 2026-11-03): шалтгаан, мэдэгдсэн өдөр, тооцоо
/// эхлэх өдөр → СЕРВЕРИЙН тооцоо шууд харагдана (апп бодохгүй). Гарсан сарын хичээлээс өдрийг «тооцохгүй»
/// болгож болно. «Хасах» дарахад л тооцоо хадгалагдаж, сурагч архивлагдана. Буцаах дүнг буцаана.
class WithdrawalSheet extends ConsumerStatefulWidget {
  const WithdrawalSheet({super.key, required this.studentId, required this.name, this.today});

  final String studentId;
  final String name;

  /// Тестэд тогтмол өдөр.
  final UbDateTime? today;

  static Future<int?> open(
    BuildContext context, {
    required String studentId,
    required String name,
    UbDateTime? today,
  }) => showModalBottomSheet<int>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (_) => WithdrawalSheet(studentId: studentId, name: name, today: today),
  );

  @override
  ConsumerState<WithdrawalSheet> createState() => _WithdrawalSheetState();
}

class _WithdrawalSheetState extends ConsumerState<WithdrawalSheet> {
  final _reason = TextEditingController();
  late final UbDateTime _today = (widget.today ?? UbDateTime.now()).startOfDay;
  late String _leftOn = _today.dateKey;
  String? _countFrom;
  final _exclude = <String>[];
  WithdrawalPreview? _preview;
  String? _previewError;
  String? _error;
  bool _saving = false;
  Timer? _debounce;
  int _gen = 0;

  @override
  void initState() {
    super.initState();
    _schedule(immediate: true);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _reason.dispose();
    super.dispose();
  }

  bool get _ready => _reason.text.trim().length >= 3 && _preview != null && _previewError == null && !_saving;

  void _schedule({bool immediate = false}) {
    _debounce?.cancel();
    _debounce = Timer(immediate ? Duration.zero : const Duration(milliseconds: 250), _fetch);
  }

  Future<void> _fetch() async {
    final gen = ++_gen;
    try {
      final p = await ref
          .read(studentsAdminRepositoryProvider)
          .withdrawalPreview(widget.studentId, leftOn: _leftOn, countFrom: _countFrom, exclude: List.of(_exclude));
      if (!mounted || gen != _gen) return;
      setState(() {
        _preview = p;
        _previewError = null;
      });
    } catch (e) {
      if (!mounted || gen != _gen) return;
      setState(() => _previewError = e is ApiError ? e.message : 'Тооцоо бодож чадсангүй');
    }
  }

  Future<void> _pickDate({required bool left}) async {
    final current = parseDateKey(left ? _leftOn : (_countFrom ?? _preview?.countFrom)) ?? _today;
    final last = left ? _today : (parseDateKey(_leftOn) ?? _today);
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime(current.year, current.month, current.day),
      firstDate: DateTime(_today.year - 2),
      lastDate: DateTime(last.year, last.month, last.day),
      helpText: left ? 'Мэдэгдсэн өдөр' : 'Тооцоо эхлэх',
    );
    if (picked == null || !mounted) return;
    final key = UbDateTime(picked.year, picked.month, picked.day).dateKey;
    setState(() {
      if (left) {
        _leftOn = key;
      } else {
        _countFrom = key;
      }
      _exclude.clear();
    });
    _schedule();
  }

  void _toggle(String date) {
    setState(() => _exclude.contains(date) ? _exclude.remove(date) : _exclude.add(date));
    _schedule();
  }

  Future<void> _submit() async {
    final p = _preview;
    if (!_ready || p == null) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final refund = await ref
          .read(studentsAdminRepositoryProvider)
          .withdraw(
            widget.studentId,
            leftOn: _leftOn,
            countFrom: p.countFrom,
            exclude: List.of(_exclude),
            reason: _reason.text,
          );
      if (!mounted) return;
      unawaited(HapticFeedback.mediumImpact());
      Navigator.of(context).pop(refund);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _saving = false;
        _error = e is ApiError ? e.message : 'Хадгалж чадсангүй. Дахин оролдоно уу';
      });
    }
  }

  String _label(String key) {
    final d = parseDateKey(key);
    return d == null ? key : DateMn.numeric(d);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = _preview;
    final bottom = MediaQuery.viewInsetsOf(context).bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.94,
        minChildSize: 0.4,
        maxChildSize: 0.94,
        builder: (context, scroll) => CustomScrollView(
          controller: scroll,
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.md),
              sliver: SliverList.list(
                children: [
                  Semantics(header: true, child: Text('Сургалтаас хасах', style: context.text.titleLarge)),
                  Text(widget.name, style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                  const SizedBox(height: AppSpace.sm),
                  Text(
                    'Ангийн жагсаалт, самбараас гарна, нэвтрэх эрх хаагдана. Ирц, дүнгийн түүх хадгалагдана. '
                    'Архиваас хэдийд ч сэргээнэ',
                    style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  ),
                  const SizedBox(height: AppSpace.md),
                  Wrap(
                    spacing: AppSpace.sm,
                    runSpacing: AppSpace.xs,
                    children: [
                      for (final r in archiveReasons)
                        ActionChip(label: Text(r), onPressed: () => setState(() => _reason.text = r)),
                    ],
                  ),
                  const SizedBox(height: AppSpace.sm),
                  TextField(
                    key: const ValueKey('withdraw-reason'),
                    controller: _reason,
                    maxLength: 500,
                    minLines: 1,
                    maxLines: 3,
                    onChanged: (_) => setState(() {}),
                    decoration: const InputDecoration(labelText: 'Шалтгаан', counterText: ''),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  Row(
                    children: [
                      Expanded(
                        child: _DateBox(
                          label: 'Мэдэгдсэн өдөр',
                          value: _label(_leftOn),
                          onTap: () => _pickDate(left: true),
                        ),
                      ),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(
                        child: _DateBox(
                          label: 'Тооцоо эхлэх',
                          value: _countFrom != null ? _label(_countFrom!) : (p == null ? '' : _label(p.countFrom)),
                          onTap: () => _pickDate(left: false),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.md),
                  if (_previewError != null)
                    Text(_previewError!, style: context.text.bodyMedium?.copyWith(color: c.error))
                  else if (p == null)
                    const SkeletonPulse(child: SkeletonCard(lines: 3))
                  else ...[
                    WithdrawalSummaryView(data: p),
                    if (p.lastCycleDays.isNotEmpty) ...[
                      const SizedBox(height: AppSpace.md),
                      Text('Гарсан сарын хичээлүүд', style: context.text.titleSmall),
                      Text(
                        'Сард 1 чөлөө автоматаар хасагдана. Эмнэлгийн чөлөө гэх мэт өдрийг сонговол суугаагүйд тооцно',
                        style: context.text.bodySmall?.copyWith(color: c.inkDim),
                      ),
                    ],
                  ],
                ],
              ),
            ),
            if (p != null && _previewError == null)
              SliverList.builder(
                itemCount: p.lastCycleDays.length,
                itemBuilder: (context, i) {
                  final d = p.lastCycleDays[i];
                  final checked = _exclude.contains(d.date);
                  return CheckboxListTile(
                    key: ValueKey('day:${d.date}'),
                    minTileHeight: AppSizes.minTap,
                    controlAffinity: ListTileControlAffinity.leading,
                    value: checked,
                    onChanged: d.assumed || (d.leave && !checked) ? null : (_) => _toggle(d.date),
                    title: Text(
                      [
                        monthDay(d.date),
                        d.assumed
                            ? 'Вэбд ирц бүртгэхээс өмнө, суусанд тооцно'
                            : d.status == null
                            ? 'Ирц бүртгээгүй'
                            : (attendanceLabel[d.status] ?? d.status!),
                        ?d.note,
                      ].join('  '),
                      style: context.text.bodyMedium,
                    ),
                    subtitle: d.leave
                        ? const Text('Чөлөө хассан')
                        : d.excluded
                        ? const Text('Тооцохгүй')
                        : null,
                  );
                },
              ),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xl),
              sliver: SliverList.list(
                children: [
                  if (_error != null) ...[
                    Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
                    const SizedBox(height: AppSpace.sm),
                  ],
                  FilledButton.icon(
                    key: const ValueKey('withdraw-submit'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(AppSizes.minTap),
                      backgroundColor: c.error,
                      foregroundColor: c.onStatus,
                    ),
                    onPressed: _ready ? _submit : null,
                    icon: const Icon(AppIcons.circleMinus, size: 18),
                    label: Text(_saving ? 'Хасаж байна' : 'Хасах'),
                  ),
                  const SizedBox(height: AppSpace.sm),
                  TextButton(
                    style: TextButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                    onPressed: _saving ? null : () => Navigator.of(context).pop(),
                    child: const Text(AppStrings.cancel),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DateBox extends StatelessWidget {
  const _DateBox({required this.label, required this.value, required this.onTap});

  final String label;
  final String value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(AppRadius.md),
    child: InputDecorator(
      decoration: InputDecoration(labelText: label, suffixIcon: const Icon(AppIcons.calendar, size: 18)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 24),
        child: Text(value, style: context.text.bodyLarge),
      ),
    ),
  );
}

/// Тооцооны хураангуй (вэбийн `WithdrawalSummary`): буцаах дүн, сар бүрийн тооцоо, суусан/төлсөн/буцаах,
/// хугацааны ирц, даалгавар. Бүх тоо серверээс.
class WithdrawalSummaryView extends StatelessWidget {
  const WithdrawalSummaryView({super.key, required this.data});

  final WithdrawalPreview data;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    final last = data.cycles.isEmpty ? null : data.cycles.last;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Буцаах дүн', style: dim),
              Text(
                formatMnt(data.refund),
                style: context.text.headlineSmall?.copyWith(fontFamily: AppTheme.displayFont),
              ),
              const SizedBox(height: 2),
              Text(
                data.refund > 0
                    ? 'Төлсөн ${formatMnt(data.paid)}'
                          '${data.refundedBefore > 0 ? ', өмнө буцаасан ${formatMnt(data.refundedBefore)}' : ''}'
                          ', суусан ${formatMnt(data.owed)}'
                    : 'Суусан хичээлийн төлбөр (${formatMnt(data.owed)}) төлсөн дүнгээс (${formatMnt(data.paid)}) '
                          'их буюу тэнцүү тул буцаах дүн алга',
                style: dim,
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(AppIcons.receipt, size: 16, color: c.brand),
                  const SizedBox(width: AppSpace.xs),
                  Text('Тооцоо', style: context.text.titleSmall),
                ],
              ),
              const SizedBox(height: AppSpace.xs),
              Meta(
                style: dim,
                items: [
                  data.classroomName,
                  '${data.planKind.label}${data.autoFull
                      ? ' (төлбөрөөр)'
                      : data.settled
                      ? ' (гараар)'
                      : ''}',
                  'сарын төлбөр ${formatMnt(data.monthlyFee)}',
                  'сард ${data.lessonsPerMonth} хичээл',
                  '1 хичээл ${formatMnt(data.perLesson)}',
                ],
              ),
              const SizedBox(height: AppSpace.sm),
              if (data.cycles.isEmpty) Text('Тооцоо эхлэхээс өмнө гарсан', style: dim),
              for (final cy in data.cycles)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 96,
                        child: Text('${monthDay(cy.start)}-${monthDay(cy.full ? cy.end : data.leftOn)}', style: dim),
                      ),
                      Expanded(
                        child: Text(
                          cy.full
                              ? 'Бүтэн сар'
                              : [
                                  'Гарсан сар: ${cy.lessons} хичээл'
                                      '${cy.assumed > 0 ? ' (${cy.assumed} нь вэбээс өмнө, суусанд тооцсон)' : ''}',
                                  if (cy.leaveDay != null) 'чөлөө 1 (${monthDay(cy.leaveDay!)}) хассан',
                                  if (cy.extraDays.isNotEmpty)
                                    '${cy.extraDays.length} өдөр хассан (${cy.extraDays.map(monthDay).join(', ')})',
                                  'тооцох ${cy.counted} хичээл',
                                ].join(', '),
                          style: context.text.bodyMedium,
                        ),
                      ),
                      Text(formatMnt(cy.charge), style: context.text.labelLarge),
                    ],
                  ),
                ),
              Divider(color: c.line),
              Row(
                children: [
                  for (final (label, v) in [
                    ('Суусан', data.owed),
                    ('Төлсөн', data.paid),
                    if (data.refundedBefore > 0) ('Өмнө буцаасан', data.refundedBefore),
                    ('Буцаах', data.refund),
                  ])
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(label, style: dim),
                          Text(formatMnt(v), style: context.text.labelLarge),
                        ],
                      ),
                    ),
                ],
              ),
              if (data.payments.isNotEmpty) ...[
                const SizedBox(height: AppSpace.sm),
                Text('Төлбөрүүд (${data.payments.length})', style: context.text.labelMedium),
                for (final pay in data.payments)
                  Row(
                    children: [
                      Expanded(child: Text(pay.label, style: dim)),
                      Text(formatMnt(pay.amount), style: context.text.bodySmall),
                    ],
                  ),
              ],
              if (data.noSchedule) ...[
                const SizedBox(height: AppSpace.sm),
                Semantics(
                  liveRegion: true,
                  child: Text(
                    'Ангийн хуваарь алга тул хичээлийн тоо бодогдоогүй — хуваариа оруулаад дахин шалгана уу',
                    style: context.text.bodyMedium?.copyWith(color: c.warning),
                  ),
                ),
              ],
              if (last != null && !last.full && last.counted > 0) ...[
                const SizedBox(height: AppSpace.xs),
                Text('Гарсан сарын дүн сарын төлбөрөөс хэтрэхгүй', style: dim),
              ],
            ],
          ),
        ),
        const SizedBox(height: AppSpace.sm),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${monthDay(data.countFrom)}-${monthDay(data.leftOn)} хугацаанд ${data.historyLessons} хичээл болсон',
                style: context.text.titleSmall,
              ),
              const SizedBox(height: AppSpace.xs),
              Meta(
                style: context.text.bodySmall,
                items: [for (final e in attendanceLabel.entries) '${e.value} ${data.attendance[e.key] ?? 0}'],
              ),
              Meta(
                style: context.text.bodySmall,
                items: [for (final e in homeworkLabel.entries) '${e.value} ${data.homework[e.key] ?? 0}'],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
