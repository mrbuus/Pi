import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../../../shared/payment_status/payment_labels.dart';
import '../../payments/data/ledger.dart';
import '../../payments/domain/ledger_format.dart' as lf;
import '../../payments/ui/ledger_screens.dart' show canSeeLedgerAmountsProvider;
import '../../payments/ui/month_blocks.dart';
import '../../payments/ui/sheet_frame.dart';
import '../application/submit_guard.dart';
import '../data/reconcile_models.dart';
import '../data/reconcile_repository.dart';

String errorText(Object e, [String fallback = MutationResult.saveFailedMessage]) =>
    e is ApiError ? e.message : fallback;

const busyMessage = 'Өмнөх хүсэлт явж байна, түр хүлээнэ үү';

void showSnack(BuildContext context, String text) => ScaffoldMessenger.maybeOf(context)
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(text)));

/// «Хуваарилагдлаа» + шийтэд бичсэн үр дүн (вэбийн toast-ийн тайлбар).
String allocatedText(AllocateResult r) {
  final w = sheetWriteText(r.sheetWrites);
  return w == null ? 'Хуваарилагдлаа' : 'Хуваарилагдлаа. $w';
}

/// Хуваарилалтыг буцаахын өмнөх асуулт (вэбийн `RowCard`, `StudentDetailDialog`-ийн бичвэр).
Future<bool> confirmUndo(BuildContext context, {String? subtitle, bool split = false, bool? inSheet}) => confirmAction(
  context,
  title: 'Хуваарилалтыг буцаах уу',
  message: [
    ?subtitle,
    'Гүйлгээ «Шийдэх» жагсаалтад буцаж орж, дахин хуваарилна',
    if (split) 'Энэ гүйлгээг хэд хэдэн хэсэгт хуваасан — бүх хэсэг нь буцна',
    switch (inSheet) {
      true => 'Шийтээс орсон төлбөр хэвээр үлдэнэ',
      false => 'Энэ гүйлгээнээс үүссэн төлбөр хүчингүй болно',
      null => 'Шийтээс орсон төлбөр хэвээр үлдэнэ. Энэ гүйлгээнээс шинээр үүссэн төлбөр байвал хүчингүй болно',
    },
  ].join('\n'),
  confirmLabel: 'Буцаах',
);

/// Мөнгө хаанаас ирсэн: илгээгч, харьцсан данс (эзэмшигч, гүйлгээний тоо), өмнө оноосон хүүхэд (вэбийн `PayerInfo`).
class PayerInfo extends StatelessWidget {
  const PayerInfo({super.key, required this.row});

  final BankRow row;

  @override
  Widget build(BuildContext context) {
    final sender = row.parts.sender;
    final acc = row.account;
    final owner = acc?.owner != null && acc!.owner != sender?.toUpperCase() ? acc.owner : null;
    if (sender == null && row.counterparty == null) return const SizedBox.shrink();
    final c = context.colors;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    Widget line(IconData icon, String label, Widget value) => Padding(
      padding: const EdgeInsets.only(top: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: c.inkDim),
          const SizedBox(width: 6),
          Text(label, style: dim),
          const SizedBox(width: 6),
          Expanded(child: value),
        ],
      ),
    );
    return Column(
      key: ValueKey('payer:${row.id}'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (sender != null)
          line(
            AppIcons.user,
            'Илгээгч',
            Text(sender, style: context.text.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
          ),
        if (row.counterparty != null)
          line(
            AppIcons.bank,
            'Данс',
            Meta(
              items: [
                row.counterparty,
                if (owner != null)
                  'Эзэмшигч $owner'
                else if (sender == null && acc?.owner == null)
                  'эзэмшигч хуулгад бичигдээгүй',
                if (acc != null && acc.txCount > 1) 'энэ данснаас ${acc.txCount} гүйлгээ',
              ],
            ),
          ),
        if (acc != null && acc.students.isNotEmpty)
          line(AppIcons.history, 'Өмнө оноосон', Meta(items: [for (final s in acc.students) s.name])),
      ],
    );
  }
}

/// «⋯» — хүүхдийн дэлгэрэнгүй товч.
class MoreButton extends StatelessWidget {
  const MoreButton({super.key, required this.name, required this.onPressed});

  final String name;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: '$name — дэлгэрэнгүй',
    constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
    icon: Icon(AppIcons.overflow, color: context.colors.inkDim),
    onPressed: onPressed,
  );
}

// ───────────────────────── «⋯» дэлгэрэнгүй ─────────────────────────

/// Хүүхдийг сонгохоос өмнө шалгах дэлгэрэнгүй: сарын он цагийн шугам (сар дээр дарахад хамрах хугацаа,
/// хэзээ, ямар данснаас), хуулгаас оноосон гүйлгээ (буцааж болно), холбоо барих.
///
/// [onPick] өгвөл доор «Энэ хүүхдийг сонгох» товч гарна — дарахад цонх хаагдаад дуудагдана.
/// [onChanged] — хуваарилалт буцаасан (жагсаалтыг шинэчлэх).
Future<void> showStudentDetail(
  BuildContext context,
  String studentId, {
  VoidCallback? onPick,
  VoidCallback? onChanged,
}) async {
  final picked = await showLedgerSheet<bool>(
    context,
    (_) => StudentDetailSheet(studentId: studentId, canPick: onPick != null, onChanged: onChanged),
  );
  if (picked ?? false) onPick?.call();
}

class StudentDetailSheet extends ConsumerStatefulWidget {
  const StudentDetailSheet({super.key, required this.studentId, this.canPick = false, this.onChanged});

  final String studentId;
  final bool canPick;
  final VoidCallback? onChanged;

  @override
  ConsumerState<StudentDetailSheet> createState() => _StudentDetailSheetState();
}

class _StudentDetailSheetState extends ConsumerState<StudentDetailSheet> {
  StudentDetail? _detail;
  StudentLedger? _ledger;
  Object? _error;
  int _tab = 0;
  String? _month;
  bool _busy = false;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  Future<void> _load() async {
    setState(() => _error = null);
    final repo = ref.read(reconcileRepositoryProvider);
    // Хоёуланг зэрэг; сарын блок алдаатай бол `null` (repository өөрөө барина).
    final ledger = repo.studentLedger(widget.studentId);
    try {
      final detail = await repo.studentDetail(widget.studentId);
      final l = await ledger;
      if (!mounted) return;
      setState(() {
        _detail = detail;
        _ledger = l;
      });
    } catch (e) {
      unawaited(ledger.then((_) {}, onError: (_) {}));
      if (mounted) setState(() => _error = e);
    }
  }

  Future<void> _undo(BankItem b) async {
    final ok = await confirmUndo(
      context,
      subtitle:
          '${lf.stampLabel(b.bookedAt)} ${formatMnt(b.txAmount)} — ${b.description.isEmpty ? 'утгагүй' : b.description}',
      split: b.partial,
      inSheet: b.inSheet,
    );
    if (!ok || !mounted) return;
    setState(() => _busy = true);
    try {
      final done = await ref
          .read(financeSubmitGuardProvider)
          .run(
            'reconcile:${b.bankTxId}',
            () => ref.read(reconcileRepositoryProvider).undo(b.bankTxId).then((_) => true),
          );
      if (!mounted) return;
      if (done == null) {
        showSnack(context, busyMessage);
        return;
      }
      showSnack(context, 'Буцаалаа — гүйлгээ «Шийдэх» жагсаалтад орлоо');
      _month = null;
      widget.onChanged?.call();
      await _load();
    } catch (e) {
      if (mounted) showSnack(context, errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final d = _detail;
    final s = d?.student;
    return LedgerSheetFrame(
      title: s?.name ?? 'Хүүхдийн мэдээлэл',
      subtitle: s == null
          ? null
          : [
              s.classroom,
              if (d!.grade != null) '${d.grade}-р анги',
              d.school,
              if (s.archived) 'Гарсан',
            ].whereType<String>().join(', '),
      footer: widget.canPick && s != null
          ? FilledButton.icon(
              key: const Key('detail-pick'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
              onPressed: () => Navigator.of(context).pop(true),
              icon: const Icon(AppIcons.check, size: 18),
              label: const Text('Энэ хүүхдийг сонгох'),
            )
          : null,
      children: [
        if (_error != null)
          SizedBox(
            height: 240,
            child: ErrorState(message: errorText(_error!, AppStrings.genericError), onRetry: () => unawaited(_load())),
          )
        else if (d == null)
          const SkeletonPulse(child: SkeletonRows(rows: 5))
        else
          ..._content(context, d),
      ],
    );
  }

  List<Widget> _content(BuildContext context, StudentDetail d) {
    final l = _ledger;
    final row = l?.row;
    final money = l != null && !l.amountsHidden && ref.watch(canSeeLedgerAmountsProvider);
    return [
      if (row != null) ...[
        Wrap(
          spacing: AppSpace.md,
          runSpacing: AppSpace.xs,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            MetaChip(label: row.plan.kind.label, tone: ChipTone.brand),
            if (money && row.paidTotal != null)
              Text('Төлсөн ${formatMnt(row.paidTotal!)}', style: context.text.titleSmall),
            if (money && (row.owedNow ?? 0) > 0)
              Text(
                'Өр ${formatMnt(row.owedNow!)}',
                style: context.text.titleSmall?.copyWith(color: context.colors.error),
              ),
            if (row.startDate != null) Text('Эхэлсэн ${lf.dayLabel(row.startDate)}', style: context.text.bodySmall),
          ],
        ),
        const SizedBox(height: AppSpace.md),
      ],
      SegmentedButton<int>(
        key: const Key('detail-tabs'),
        showSelectedIcon: false,
        segments: [
          const ButtonSegment(value: 0, label: Text('Сар бүр')),
          ButtonSegment(value: 1, label: Text('Гүйлгээ (${d.bank.length})')),
          const ButtonSegment(value: 2, label: Text('Холбоо')),
        ],
        selected: {_tab},
        onSelectionChanged: (v) => setState(() => _tab = v.first),
      ),
      const SizedBox(height: AppSpace.md),
      ...switch (_tab) {
        0 => _months(context, l, money),
        1 => _bank(context, d, l, money),
        _ => _contact(context, d),
      },
    ];
  }

  List<Widget> _months(BuildContext context, StudentLedger? l, bool money) {
    final row = l?.row;
    if (l == null || row == null || row.blocks.isEmpty) {
      return [
        Text(
          'Сарын төлбөрийн мэдээлэл алга (анги оноогдоогүй байж магадгүй)',
          style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
        ),
      ];
    }
    final picked = row.blocks.where((b) => b.month == _month).firstOrNull;
    return [
      MonthBlocks(
        blocks: row.blocks,
        money: money,
        settled: row.plan.settled,
        timeline: true,
        pickAll: true,
        selected: _month,
        onPick: (m) => setState(() => _month = _month == m ? null : m),
      ),
      const SizedBox(height: AppSpace.sm),
      if (picked != null)
        MonthSourceCard(
          block: picked,
          ledger: l,
          bank: _detail?.bank ?? const [],
          money: money,
          onClose: () => setState(() => _month = null),
        )
      else
        Row(
          children: [
            Expanded(
              child: Text(
                'Сар дээр дарж тэр сарын төлбөрийг харна',
                style: context.text.bodySmall?.copyWith(color: context.colors.inkDim),
              ),
            ),
            const InfoHint(title: 'Блокийн тайлбар', message: blockLegendText),
          ],
        ),
    ];
  }

  List<Widget> _bank(BuildContext context, StudentDetail d, StudentLedger? l, bool money) {
    final c = context.colors;
    final linked = {for (final b in d.bank) ?b.paymentId};
    final other = [
      for (final p in l?.payments ?? const <LedgerPayment>[])
        if (p.status == 'CONFIRMED' && !linked.contains(p.id)) p,
    ];
    return [
      if (d.bank.isEmpty)
        Text('Энэ хүүхдэд хуулгаас оноосон гүйлгээ алга', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
      else
        AppCard(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.xs),
          child: Column(
            children: [
              for (var i = 0; i < d.bank.length; i++) ...[
                if (i > 0) Divider(height: 1, color: c.line),
                _BankLine(item: d.bank[i], busy: _busy, onUndo: () => unawaited(_undo(d.bank[i]))),
              ],
            ],
          ),
        ),
      if (other.isNotEmpty && money) ...[
        const SizedBox(height: AppSpace.md),
        Text('Хуулгатай холбогдоогүй төлбөр', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
        const SizedBox(height: AppSpace.xs),
        AppCard(
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
          child: Column(
            children: [
              for (final p in other)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                  child: Row(
                    children: [
                      Text(lf.mntOrEmpty(p.amount), style: context.text.titleSmall),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(
                        child: Meta(
                          items: [
                            if (p.forMonth != null) lf.monthName(p.forMonth!),
                            paymentMethodLabel(p.method) ?? p.method,
                          ],
                        ),
                      ),
                      Text(lf.dayLabel(p.paidAt ?? p.createdAt), style: context.text.bodySmall),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    ];
  }

  List<Widget> _contact(BuildContext context, StudentDetail d) {
    final c = context.colors;
    return [
      if (d.contacts.isEmpty)
        Text('Утас бүртгэгдээгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
      else
        for (final p in d.contacts)
          ListTile(
            key: ValueKey('contact:${p.label}'),
            contentPadding: EdgeInsets.zero,
            minTileHeight: AppSizes.minTap,
            leading: Icon(AppIcons.phone, color: c.inkDim),
            title: Text(p.value),
            subtitle: Text(p.label),
            onTap: () => unawaited(launchUrl(Uri.parse('tel:${p.value.replaceAll(RegExp(r'\s'), '')}'))),
          ),
      if (d.payers.isNotEmpty) ...[
        const SizedBox(height: AppSpace.md),
        Text('Энэ хүүхдэд төлдөг данс, утас', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
        const SizedBox(height: AppSpace.xs),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            for (final h in d.payers)
              MetaChip(icon: h.kind == 'PHONE' ? AppIcons.phone : AppIcons.bank, label: '${h.value}  ${h.count} удаа'),
          ],
        ),
      ],
    ];
  }
}

/// Хуулгаас оноосон нэг гүйлгээ — нягт мөр, «Буцаах».
class _BankLine extends StatelessWidget {
  const _BankLine({required this.item, required this.onUndo, required this.busy});

  final BankItem item;
  final VoidCallback onUndo;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    final b = item;
    final dim = context.text.bodySmall?.copyWith(color: context.colors.inkDim);
    return Padding(
      key: ValueKey('bank:${b.id}'),
      padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: AppSpace.sm,
                  children: [
                    Text(formatMnt(b.amount), style: context.text.titleSmall),
                    if (b.partial) Text('/ ${formatMnt(b.txAmount)}', style: dim),
                    Text(lf.stampLabel(b.bookedAt), style: dim),
                  ],
                ),
                Text(
                  b.description.isEmpty ? 'Утгагүй гүйлгээ' : b.description,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: context.text.bodyMedium,
                ),
                Meta(
                  items: [
                    b.kindLabel,
                    if (b.counterparty != null) 'Данс ${b.counterparty}',
                    b.sender,
                    if (b.kind.isTuition) b.inSheet ? 'Шийтэд бүртгэлтэй' : 'Шинэ төлбөр',
                  ],
                ),
              ],
            ),
          ),
          TextButton.icon(
            key: ValueKey('bank-undo:${b.id}'),
            style: TextButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
            onPressed: busy ? null : onUndo,
            icon: const Icon(AppIcons.undo, size: 18),
            label: const Text('Буцаах'),
          ),
        ],
      ),
    );
  }
}

/// Дарсан сарын карт: хамрах хугацаа, төлөв, аль төлбөр(үүд) дүүргэсэн — хэзээ, ямар данснаас.
class MonthSourceCard extends StatelessWidget {
  const MonthSourceCard({
    super.key,
    required this.block,
    required this.ledger,
    required this.bank,
    required this.money,
    required this.onClose,
  });

  final MonthBlock block;
  final StudentLedger ledger;
  final List<BankItem> bank;
  final bool money;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final b = block;
    final c = context.colors;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    final parts = ledger.sources[b.month] ?? const <BlockSource>[];
    final period = b.hasPeriod ? periodLabel(b) : lf.fallbackPeriod(b.month, ledger.row.startDate, ledger.yearStart);
    return AppCard(
      key: ValueKey('month-card:${b.month}'),
      accent: c.brandBright,
      padding: const EdgeInsets.all(AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Meta(
                  items: [
                    lf.monthName(b.month),
                    period,
                    b.state.label,
                    if (money && (b.due ?? 0) > 0) '${lf.mntOrEmpty(b.paid)} / ${lf.mntOrEmpty(b.due)}',
                  ],
                ),
              ),
              IconButton(tooltip: AppStrings.close, icon: const Icon(AppIcons.close, size: 18), onPressed: onClose),
            ],
          ),
          if (parts.isEmpty)
            Text(b.dueOn != null ? 'Төлбөр ороогүй, төлөх өдөр ${lf.dayLabel(b.dueOn)}' : 'Төлбөр ороогүй', style: dim)
          else
            for (final part in parts) _sourceLine(context, part, dim),
        ],
      ),
    );
  }

  Widget _sourceLine(BuildContext context, BlockSource part, TextStyle? dim) {
    final pay = ledger.payments.where((p) => p.id == part.paymentId).firstOrNull;
    final tx = bank.where((x) => x.paymentId == part.paymentId).firstOrNull;
    final whole = pay?.amount;
    final amount = part.amount;
    return Padding(
      key: ValueKey('source:${part.paymentId}'),
      padding: const EdgeInsets.only(top: AppSpace.xs),
      child: Wrap(
        spacing: AppSpace.md,
        runSpacing: 2,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Text.rich(
            TextSpan(
              children: [
                TextSpan(text: amount != null && money ? formatMnt(amount) : 'Төлсөн'),
                if (money && amount != null && whole != null && whole > amount)
                  TextSpan(text: ' / ${formatMnt(whole)}', style: dim),
              ],
            ),
            style: context.text.titleSmall,
          ),
          Text(lf.stampLabel(tx?.bookedAt ?? pay?.paidAt ?? pay?.createdAt), style: dim),
          if (tx != null)
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(AppIcons.bank, size: 14, color: context.colors.inkDim),
                const SizedBox(width: 4),
                Flexible(child: Meta(items: [tx.counterparty, tx.sender ?? tx.description])),
              ],
            )
          else if (pay != null)
            Text(
              pay.method == 'BANK_TRANSFER'
                  ? 'Шийтээс, хуулгад холбогдоогүй'
                  : (paymentMethodLabel(pay.method) ?? pay.method ?? ''),
              style: dim,
            ),
        ],
      ),
    );
  }
}

// ───────────────────────── Хүүхэд сонгох ─────────────────────────

/// Хүүхэд хайх (нэр, овог эсвэл утасны хэсгээр) — сонгосныг харуулж, солих боломжтой (вэбийн `StudentPicker`).
class StudentPickerField extends ConsumerStatefulWidget {
  const StudentPickerField({super.key, required this.value, required this.onChanged, this.suggestions = const []});

  final StudentCard? value;
  final ValueChanged<StudentCard?> onChanged;

  /// Тулгалтын санал болгосон хүүхдүүд — хайхгүйгээр сонгоно.
  final List<StudentCard> suggestions;

  @override
  ConsumerState<StudentPickerField> createState() => _StudentPickerFieldState();
}

class _StudentPickerFieldState extends ConsumerState<StudentPickerField> {
  final _q = TextEditingController();
  Timer? _debounce;
  List<StudentCard> _items = const [];
  bool _loading = false;
  String? _error;
  int _seq = 0;

  @override
  void dispose() {
    _debounce?.cancel();
    _q.dispose();
    super.dispose();
  }

  void _changed(String text) {
    _debounce?.cancel();
    final t = text.trim();
    setState(() {
      _error = null;
      if (t.length < 2) {
        _items = const [];
        _loading = false;
      }
    });
    if (t.length >= 2) _debounce = Timer(const Duration(milliseconds: 250), () => unawaited(_search(t)));
  }

  Future<void> _search(String t) async {
    final seq = ++_seq;
    setState(() => _loading = true);
    try {
      final items = await ref.read(reconcileRepositoryProvider).searchStudents(t);
      if (!mounted || seq != _seq) return;
      setState(() {
        _items = items;
        _loading = false;
      });
    } catch (_) {
      if (!mounted || seq != _seq) return;
      setState(() {
        _loading = false;
        _error = 'Хайлт амжилтгүй боллоо';
      });
    }
  }

  void _detail(StudentCard s) =>
      unawaited(showStudentDetail(context, s.id, onPick: s.id == widget.value?.id ? null : () => widget.onChanged(s)));

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final v = widget.value;
    if (v != null) {
      return DecoratedBox(
        key: const Key('picker-selected'),
        decoration: BoxDecoration(
          color: c.surfaceSunken,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: c.brandBright),
        ),
        child: Row(
          children: [
            const SizedBox(width: AppSpace.md),
            Expanded(child: Meta(items: [v.name, v.classroom, if (v.archived) 'Гарсан'])),
            MoreButton(name: v.name, onPressed: () => _detail(v)),
            IconButton(
              tooltip: 'Сонгосон хүүхдийг солих',
              constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
              icon: const Icon(AppIcons.close, size: 18),
              onPressed: () => widget.onChanged(null),
            ),
          ],
        ),
      );
    }
    final searching = _q.text.trim().length >= 2;
    final list = searching ? _items : widget.suggestions;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          key: const Key('picker-search'),
          controller: _q,
          autocorrect: false,
          decoration: InputDecoration(
            hintText: 'Нэр, овог эсвэл утас',
            prefixIcon: const Icon(AppIcons.search, size: 20),
            suffixIcon: _loading
                ? const Padding(
                    padding: EdgeInsets.all(14),
                    child: SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)),
                  )
                : null,
          ),
          onChanged: _changed,
        ),
        if (_error != null)
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.xs),
            child: Text(_error!, style: context.text.bodySmall?.copyWith(color: c.error)),
          ),
        if (list.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.xs),
            child: DecoratedBox(
              decoration: BoxDecoration(
                border: Border.all(color: c.line),
                borderRadius: BorderRadius.circular(AppRadius.md),
              ),
              child: Column(
                children: [
                  for (var i = 0; i < list.length; i++) ...[
                    if (i > 0) Divider(height: 1, color: c.line),
                    Row(
                      key: ValueKey('pick:${list[i].id}'),
                      children: [
                        Expanded(
                          child: InkWell(
                            onTap: () => widget.onChanged(list[i]),
                            child: ConstrainedBox(
                              constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                              child: Padding(
                                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.xs),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Meta(items: list[i].meta),
                                    if (list[i].phones.isNotEmpty)
                                      Meta(items: [for (final p in list[i].phones) '${p.label} ${p.value}']),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        ),
                        MoreButton(name: list[i].name, onPressed: () => _detail(list[i])),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        if (searching && !_loading && _error == null && _items.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: AppSpace.xs),
            child: Text('Олдсонгүй', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
          ),
      ],
    );
  }
}

// ───────────────────────── Хуваарилах ─────────────────────────

/// Нэг гүйлгээг хүүхэд/зориулалтад хуваарилах. Хадгалсан бол серверийн хариу, хаавал `null`.
Future<AllocateResult?> showAllocateSheet(BuildContext context, BankRow row) =>
    showLedgerSheet<AllocateResult>(context, (_) => AllocateSheet(row: row));

class AllocateSheet extends ConsumerStatefulWidget {
  const AllocateSheet({super.key, required this.row});

  final BankRow row;

  @override
  ConsumerState<AllocateSheet> createState() => _AllocateSheetState();
}

class _Part {
  _Part(this.draft)
    : amount = TextEditingController(text: draft.amount > 0 ? ThousandsFormatter.format(draft.amount) : '');

  static int _seq = 0;
  final int key = ++_seq;
  final AllocDraft draft;
  final TextEditingController amount;
}

class _AllocateSheetState extends ConsumerState<AllocateSheet> {
  late final List<_Part> _parts;
  late final bool _guessed;
  bool _saving = false;
  String? _error;

  BankRow get _row => widget.row;

  @override
  void initState() {
    super.initState();
    final init = initialDrafts(_row);
    _parts = [for (final d in init.drafts) _Part(d)];
    _guessed = init.guessed;
  }

  @override
  void dispose() {
    for (final p in _parts) {
      p.amount.dispose();
    }
    super.dispose();
  }

  int get _sum => _parts.fold(0, (t, p) => t + (FormMoneyField.parse(p.amount.text) ?? 0));
  int get _rest => _row.amount - _sum;
  bool get _missingKid => _parts.any((p) => p.draft.kind.isTuition && p.draft.student == null);

  List<StudentCard> get _suggested => [for (final c in _row.suggestion?.candidates ?? const <Candidate>[]) ?c.student];

  Future<void> _save() async {
    setState(() {
      _saving = true;
      _error = null;
    });
    for (final p in _parts) {
      p.draft.amount = FormMoneyField.parse(p.amount.text) ?? 0;
    }
    try {
      final res = await ref
          .read(financeSubmitGuardProvider)
          .run(
            'reconcile:${_row.id}',
            () => ref.read(reconcileRepositoryProvider).allocate(_row.id, [for (final p in _parts) p.draft.toPart()]),
          );
      if (!mounted) return;
      if (res == null) {
        setState(() => _error = busyMessage);
        return;
      }
      Navigator.of(context).pop(res);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final rest = _rest;
    final kinds = AllocKind.choicesFor(debit: _row.debit);
    final main = _row.parts.main;
    return LedgerSheetFrame(
      title: 'Хуваарилах',
      subtitle: '${formatMnt(_row.amount)} — ${main.isEmpty ? 'утгагүй' : main}',
      error: _error,
      footer: SheetPrimaryButton(
        key: const Key('allocate-save'),
        label: AppStrings.save,
        busy: _saving,
        onPressed: rest == 0 && !_missingKid ? () => unawaited(_save()) : null,
      ),
      children: [
        PayerInfo(row: _row),
        const SizedBox(height: AppSpace.md),
        for (final p in _parts) ...[
          AppCard(
            key: ValueKey('part:${p.key}'),
            padding: const EdgeInsets.all(AppSpace.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<AllocKind>(
                        key: ValueKey('part-kind:${p.key}'),
                        initialValue: kinds.contains(p.draft.kind) ? p.draft.kind : kinds.first,
                        isExpanded: true,
                        decoration: const InputDecoration(labelText: 'Зориулалт'),
                        items: [for (final k in kinds) DropdownMenuItem(value: k, child: Text(k.label))],
                        onChanged: (k) => setState(() => p.draft.kind = k ?? p.draft.kind),
                      ),
                    ),
                    if (_parts.length > 1)
                      IconButton(
                        tooltip: 'Хэсгийг хасах',
                        constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
                        icon: Icon(AppIcons.trash, color: c.inkDim),
                        onPressed: () {
                          setState(() => _parts.remove(p));
                          // Талбар энэ кадрт хасагдсаны дараа л суллана.
                          WidgetsBinding.instance.addPostFrameCallback((_) => p.amount.dispose());
                        },
                      ),
                  ],
                ),
                const SizedBox(height: AppSpace.sm),
                TextField(
                  key: ValueKey('part-amount:${p.key}'),
                  controller: p.amount,
                  keyboardType: TextInputType.number,
                  inputFormatters: const [ThousandsFormatter()],
                  textAlign: TextAlign.right,
                  decoration: const InputDecoration(labelText: 'Дүн', suffixText: '₮'),
                  onChanged: (_) => setState(() {}),
                ),
                if (p.draft.kind.forStudent) ...[
                  const SizedBox(height: AppSpace.sm),
                  StudentPickerField(
                    value: p.draft.student,
                    suggestions: _suggested,
                    onChanged: (s) => setState(() => p.draft.student = s),
                  ),
                ],
                if (p.draft.student != null && _row.sheetPaysOf(p.draft.student!.id).isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: AppSpace.sm),
                    child: Row(
                      children: [
                        Icon(AppIcons.fileCheck, size: 16, color: c.info),
                        const SizedBox(width: 6),
                        Expanded(
                          child: Text(
                            'Шийтэд: ${_row.sheetPaysOf(p.draft.student!.id).map((x) => '${formatMnt(x.amount)} (${lf.dayLabel(x.date)})').join(', ')}',
                            style: context.text.bodySmall,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.sm),
        ],
        Wrap(
          alignment: WrapAlignment.spaceBetween,
          crossAxisAlignment: WrapCrossAlignment.center,
          spacing: AppSpace.md,
          runSpacing: AppSpace.sm,
          children: [
            OutlinedButton.icon(
              key: const Key('allocate-add'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
              onPressed: _parts.length >= 10
                  ? null
                  : () => setState(
                      () => _parts.add(
                        _Part(
                          AllocDraft(
                            kind: _parts.lastOrNull?.draft.kind ?? AllocKind.tuition,
                            amount: rest > 0 ? rest : 0,
                          ),
                        ),
                      ),
                    ),
              icon: const Icon(AppIcons.add, size: 18),
              label: const Text('Хэсэг нэмэх'),
            ),
            Text(
              rest == 0
                  ? 'Дүн таарч байна'
                  : rest > 0
                  ? '${formatMnt(rest)} хуваарилагдаагүй'
                  : '${formatMnt(-rest)} илүү',
              key: const Key('allocate-rest'),
              style: context.text.titleSmall?.copyWith(color: rest == 0 ? c.success : c.error),
            ),
          ],
        ),
        if (_guessed) ...[
          const SizedBox(height: AppSpace.sm),
          Text('Дүнг тэнцүү хувааж санал болгосон — бодит дүнгээ оруулна уу', style: context.text.bodySmall),
        ],
        if (_missingKid) ...[
          const SizedBox(height: AppSpace.sm),
          Text('Сургалтын төлбөрт хүүхэд сонгоно уу', style: context.text.bodySmall),
        ],
      ],
    );
  }
}
