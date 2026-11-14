import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../data/ledger.dart';
import '../data/payments_repository.dart';
import '../domain/ledger_format.dart';
import 'month_blocks.dart';
import 'sheet_frame.dart';

String _err(Object e) => e is ApiError ? e.message : MutationResult.saveFailedMessage;

void _snack(BuildContext context, String text) => ScaffoldMessenger.maybeOf(context)
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(text)));

// ───────────────────────── Хугацаа сунгах ─────────────────────────

/// Сунгалтын шалтгаан (вэбийн `ExtendDialog` REASONS-тэй ижил).
const extendReasons = ['Өвчтэй байсан', 'Чөлөө авсан', 'Төв ажиллаагүй (засвар, амралт)', 'Бусад'];

/// Сар бүрийн төлбөрийн хугацаа сунгах (эзэн 2026-11-12): сонгосон сарын төлөх өдөр N хоногоор хойшилж,
/// дараагийн бүх сар дагаж шилжинэ. Хэмжээ хязгааргүй, шалтгаан заавал. Өмнөх сунгалтыг цуцалж болно —
/// сервер зөөлөн цуцалж аудитад бичнэ. Цонх хаагдахад дуудагч ledger-ийг дахин ачаална.
Future<void> showExtendSheet(BuildContext context, StudentLedger data) =>
    showLedgerSheet<void>(context, (_) => ExtendSheet(data: data));

class ExtendSheet extends ConsumerStatefulWidget {
  const ExtendSheet({super.key, required this.data});

  final StudentLedger data;

  @override
  ConsumerState<ExtendSheet> createState() => _ExtendSheetState();
}

class _ExtendSheetState extends ConsumerState<ExtendSheet> {
  late final List<MonthBlock> _months = [
    for (final b in widget.data.row.blocks)
      if (b.state != LedgerState.off) b,
  ];
  late String _month =
      (_months.where((b) => b.state != LedgerState.paid).firstOrNull ?? _months.firstOrNull)?.month ?? '';
  late final List<LedgerExtension> _extensions = [...widget.data.extensions];
  final _days = TextEditingController();
  final _other = TextEditingController();
  String _reason = extendReasons.first;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _days.dispose();
    _other.dispose();
    super.dispose();
  }

  int get _n => int.tryParse(_days.text) ?? 0;
  String get _reasonText => _reason == 'Бусад' ? _other.text.trim() : _reason;

  /// Урьдчилан харах: тэр сарын шинэ хугацаа (огнооны шилжилт — мөнгө биш).
  String? get _preview {
    final b = _months.where((x) => x.month == _month).firstOrNull;
    if (b == null || !b.hasPeriod || _n < 1) return null;
    // Сум (глиф) биш, үгээр: «11/07 – 12/07 нь 11/12 – 12/12 болно».
    return '${dayLabel(b.periodFrom)} – ${dayLabel(b.periodTo)} нь '
        '${dayLabel(addDays(b.periodFrom!, _n))} – ${dayLabel(addDays(b.periodTo!, _n))} болно';
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final student = widget.data.row.id;
    try {
      await ref.read(paymentsRepositoryProvider).extend(student, month: _month, days: _n, reason: _reasonText);
      if (!mounted) return;
      _snack(context, '${monthName(_month)}-ын хугацааг $_n хоногоор сунгалаа');
      Navigator.of(context).pop();
    } catch (e) {
      if (mounted) setState(() => _error = _err(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _cancel(LedgerExtension e) async {
    final ok = await confirmAction(
      context,
      title: 'Сунгалтыг цуцлах уу',
      message: '${monthName(e.month)} +${e.days} хоног. Цуцалсан сунгалт түүхэнд үлдэнэ',
      confirmLabel: 'Цуцлах',
    );
    if (!ok || !mounted) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(paymentsRepositoryProvider).cancelExtension(widget.data.row.id, e.id);
      if (!mounted) return;
      setState(() => _extensions.removeWhere((x) => x.id == e.id));
      _snack(context, 'Сунгалтыг цуцаллаа');
    } catch (err) {
      if (mounted) setState(() => _error = _err(err));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final canSave = _month.isNotEmpty && _n >= 1 && _reasonText.isNotEmpty;
    return LedgerSheetFrame(
      title: 'Төлбөрийн хугацаа сунгах',
      subtitle: 'Сонгосон сарын төлөх өдөр хойшилж, дараагийн бүх сар дагаж шилжинэ',
      error: _error,
      footer: SheetPrimaryButton(
        key: const Key('extend-save'),
        label: 'Сунгах',
        busy: _busy,
        onPressed: canSave ? () => unawaited(_save()) : null,
      ),
      children: [
        SheetField(
          label: 'Аль сараас',
          child: DropdownButtonFormField<String>(
            key: const Key('extend-month'),
            initialValue: _month.isEmpty ? null : _month,
            isExpanded: true,
            items: [
              for (final b in _months)
                DropdownMenuItem(
                  value: b.month,
                  child: Text('${monthName(b.month)}${b.hasPeriod ? ' (${periodLabel(b)})' : ''}'),
                ),
            ],
            onChanged: _busy ? null : (v) => setState(() => _month = v ?? _month),
          ),
        ),
        SheetField(
          label: 'Хэдэн хоног',
          hint: _preview,
          child: TextField(
            key: const Key('extend-days'),
            controller: _days,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(3)],
            onChanged: (_) => setState(() {}),
          ),
        ),
        SheetField(
          label: 'Шалтгаан',
          child: DropdownButtonFormField<String>(
            key: const Key('extend-reason'),
            initialValue: _reason,
            isExpanded: true,
            items: [for (final r in extendReasons) DropdownMenuItem(value: r, child: Text(r))],
            onChanged: _busy ? null : (v) => setState(() => _reason = v ?? _reason),
          ),
        ),
        if (_reason == 'Бусад')
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.md),
            child: TextField(
              key: const Key('extend-other'),
              controller: _other,
              maxLength: 300,
              decoration: const InputDecoration(hintText: 'Шалтгаанаа бичнэ үү'),
              onChanged: (_) => setState(() {}),
            ),
          ),
        if (_extensions.isNotEmpty) ...[
          const SizedBox(height: AppSpace.sm),
          Text('Өмнөх сунгалтууд', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.xs),
          AppCard(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.xs),
            child: Column(
              children: [
                for (var i = 0; i < _extensions.length; i++) ...[
                  if (i > 0) Divider(height: 1, color: c.line),
                  Row(
                    key: ValueKey('ext:${_extensions[i].id}'),
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '${monthName(_extensions[i].month)} +${_extensions[i].days} хоног',
                              style: context.text.titleSmall,
                            ),
                            Meta(
                              items: [
                                _extensions[i].reason,
                                _extensions[i].authorName ?? 'Тодорхойгүй',
                                if (stampLabel(_extensions[i].at) case final s when s.length >= 5) s.substring(0, 5),
                              ],
                            ),
                          ],
                        ),
                      ),
                      TextButton.icon(
                        key: ValueKey('ext-cancel:${_extensions[i].id}'),
                        style: TextButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
                        onPressed: _busy ? null : () => unawaited(_cancel(_extensions[i])),
                        icon: const Icon(AppIcons.trash, size: 18),
                        label: const Text('Цуцлах'),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ],
    );
  }
}

// ───────────────────────── Багц ─────────────────────────

/// Тохирсон (хөнгөлөлттэй) бүтэн жилийн гэрээний доод хязгаар (вэбийн `PlanDialog`, серверийн `inRange`).
const agreedMin = 800000;

/// Бүтэн жилд үнийн жагсаалтаас БАГА дүн = тохирсон (хөнгөлөлттэй) гэрээ (вэбийн `PlanDialog.discount`).
/// Үнэ мэдэгдэхгүй (Багш+) бол хэзээ ч `false` — тэр үед `tuitionAgreed`-ийг илгээхгүй.
bool isAgreedDiscount(PlanKind kind, int value, int? listPrice) =>
    kind == PlanKind.fullYear && listPrice != null && value >= agreedMin && value < listPrice;

/// Багц, дүн, сууж эхэлсэн өдрийг засах (`PATCH /users/:id/profile`, Админ, Багш+). Хадгалсан бол `true`.
Future<bool> showPlanSheet(BuildContext context, StudentLedger data) async =>
    await showLedgerSheet<bool>(context, (_) => PlanSheet(data: data)) ?? false;

class PlanSheet extends ConsumerStatefulWidget {
  const PlanSheet({super.key, required this.data});

  final StudentLedger data;

  @override
  ConsumerState<PlanSheet> createState() => _PlanSheetState();
}

class _PlanSheetState extends ConsumerState<PlanSheet> {
  late PlanKind _kind = widget.data.row.plan.kind;
  late final _amount = TextEditingController(text: _initialAmount());
  late String? _start = widget.data.row.startDate;
  bool _busy = false;
  String? _error;

  PriceTier? get _tier => widget.data.tier;
  int? _price(PlanKind k) => _tier?.priceOf(k);

  String _initialAmount() {
    final p = widget.data.row.plan;
    final v = (_kind == PlanKind.monthly ? p.fee : p.total) ?? _price(_kind);
    return v == null || v == 0 ? '' : ThousandsFormatter.format(v);
  }

  int get _value => FormMoneyField.parse(_amount.text) ?? 0;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  String? get _hint {
    final price = _price(_kind);
    final first = _tier?.installmentFirst;
    if (_kind == PlanKind.installment && first != null) {
      return 'Эхний төлбөр ${formatMnt(first)} 12-р сар хүртэл, үлдэгдэл 12/20-нд';
    }
    if (isAgreedDiscount(_kind, _value, price)) {
      return 'Хөнгөлөлттэй гэрээ: ${formatMnt(_value)} төлөгдвөл жилийн төлбөр бүрэн гэж тооцно '
          '(үнийн жагсаалт ${formatMnt(price!)})';
    }
    return price == null ? null : 'Үнийн жагсаалт: ${formatMnt(price)}';
  }

  Future<void> _pickStart() async {
    final initial = DateTime.tryParse(_start ?? '') ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime(2035),
    );
    if (picked == null || !mounted) return;
    String p(int x) => x.toString().padLeft(2, '0');
    setState(() => _start = '${picked.year}-${p(picked.month)}-${p(picked.day)}');
  }

  Future<void> _save() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    final price = _price(_kind);
    final value = _value;
    try {
      await ref
          .read(paymentsRepositoryProvider)
          .updatePlan(
            widget.data.row.id,
            kind: _kind,
            amount: value > 0 ? value : price,
            agreed: isAgreedDiscount(_kind, value, price) ? value : null,
            // Үнэ мэдэгдэхгүй (Багш+) бол хөнгөлөлтийг шийдэх боломжгүй — Админы тавьсныг дарж бичихгүй.
            sendAgreed: price != null,
            joinedOn: _start,
          );
      if (!mounted) return;
      _snack(context, 'Багц хадгалагдлаа');
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) setState(() => _error = _err(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.data.row;
    return LedgerSheetFrame(
      title: 'Төлбөрийн багц',
      subtitle: [r.name, _tier?.label].whereType<String>().where((s) => s.isNotEmpty).join(' — '),
      error: _error,
      footer: SheetPrimaryButton(
        key: const Key('plan-save'),
        label: AppStrings.save,
        busy: _busy,
        onPressed: () => unawaited(_save()),
      ),
      children: [
        SheetField(
          label: 'Багц',
          child: SegmentedButton<PlanKind>(
            key: const Key('plan-kind'),
            showSelectedIcon: false,
            segments: [
              const ButtonSegment(value: PlanKind.monthly, label: Text('Сар бүр')),
              const ButtonSegment(value: PlanKind.fullYear, label: Text('Бүтэн жил')),
              if (_tier?.installment != null)
                const ButtonSegment(value: PlanKind.installment, label: Text('Хагас жил')),
            ],
            selected: {_kind},
            onSelectionChanged: _busy
                ? null
                : (s) => setState(() {
                    _kind = s.first;
                    final p = _price(_kind);
                    _amount.text = p == null ? '' : ThousandsFormatter.format(p);
                  }),
          ),
        ),
        SheetField(
          label: _kind == PlanKind.monthly ? 'Сарын төлбөр' : 'Жилийн нийт дүн',
          hint: _hint,
          child: TextField(
            key: const Key('plan-amount'),
            controller: _amount,
            keyboardType: TextInputType.number,
            inputFormatters: const [ThousandsFormatter()],
            decoration: const InputDecoration(suffixText: '₮'),
            onChanged: (_) => setState(() {}),
          ),
        ),
        SheetField(
          label: 'Сууж эхэлсэн өдөр',
          child: OutlinedButton.icon(
            key: const Key('plan-start'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(AppSizes.minTap),
              alignment: Alignment.centerLeft,
            ),
            onPressed: _busy ? null : () => unawaited(_pickStart()),
            icon: const Icon(AppIcons.calendar, size: 18),
            label: Text(_start == null ? 'Сонгох' : _start!.replaceAll('-', '.')),
          ),
        ),
      ],
    );
  }
}
