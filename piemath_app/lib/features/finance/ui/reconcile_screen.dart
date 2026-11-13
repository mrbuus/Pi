import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../../payments/domain/ledger_format.dart' as lf;
import '../../payments/ui/sheet_frame.dart';
import '../application/finance_providers.dart';
import '../application/statement_picker.dart';
import '../application/submit_guard.dart';
import '../data/reconcile_models.dart';
import '../data/reconcile_repository.dart';
import 'finance_widgets.dart';
import 'reconcile_sheets.dart';

/// `/app/admin/reconcile` — банкны хуулга (вэбийн `ReconcilePageClient`): хуулга оруулах, «Шийтэд хөтлөгдсөн
/// өдөр», жагсаалт (Бүгд, Шийдэх, Сургалтын төлбөр, Бусад орлого, Зарлага, Шийтэд хөтлөгдсөн), гүйлгээ бүрийг
/// хүүхэд/зориулалтад хуваарилах, буцаах, хүүхдийн «⋯» дэлгэрэнгүй.
///
/// Эрх: Админ, санхүүгийн эрхтэй Багш+ ([ReconcileGate]). Тулгалт, ангилал, төлбөр үүсгэх, шийтэд бичих бүгд
/// серверт — апп нийт мөнгө тооцохгүй.
class ReconcileScreen extends StatelessWidget {
  const ReconcileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Банкны хуулга')),
      body: ReconcileGate(builder: (_, _) => const ReconcileBody()),
    );
  }
}

class ReconcileBody extends ConsumerStatefulWidget {
  const ReconcileBody({super.key});

  @override
  ConsumerState<ReconcileBody> createState() => _ReconcileBodyState();
}

class _ReconcileBodyState extends ConsumerState<ReconcileBody> {
  final _list = DataListController<BankRow>();

  /// «Шийтэд хөтлөгдсөн»-өөс зөвхөн шийтэд баталгаажаагүйг.
  bool _checkOnly = false;
  ImportSummary? _lastImport;

  static final _filters = [
    for (final l in Lane.values)
      if (l != Lane.all) DataFilter(l.api, l.label),
  ];

  Lane get _lane => Lane.fromApi(_list.query.filter);

  Future<DataPage<BankRow>> _load(DataQuery q) async {
    final lane = Lane.fromApi(q.filter);
    final offset = int.tryParse(q.cursor ?? '') ?? 0;
    // Эхний хуудсыг дахин ачаалахдаа одоо харагдаж буй мөрийг бүгдийг авна (байрлал үсрэхгүй).
    final limit = q.isFirstPage ? math.min(200, math.max(ReconcileRepository.pageSize, _list.items.length)) : 50;
    final page = await ref
        .read(reconcileRepositoryProvider)
        .rows(lane: lane, query: q.search, checkOnly: _checkOnly, offset: offset, limit: limit);
    var counts = const <String, int>{};
    if (q.isFirstPage) {
      try {
        final o = await ref.refresh(reconcileOverviewProvider.future);
        counts = {DataFilter.allId: o.count(Lane.all), for (final l in Lane.values) l.api: o.count(l)};
      } on Object {
        // Тоо ачаалагдаагүй ч жагсаалт харагдана — дээд хэсэг өөрөө «Дахин оролдох»-той.
      }
    }
    final next = offset + page.items.length;
    return DataPage(
      items: page.items,
      nextCursor: page.items.isNotEmpty && next < page.total ? '$next' : null,
      total: page.total,
      filterCounts: counts,
    );
  }

  /// Хуваарилсан/буцаасан мөр: «Бүгд»-д үлдэж өнгө нь солигдоно, бусад жагсаалтаас шууд гарна.
  void _done(String rowId, [int alsoResolved = 0]) {
    if (_lane != Lane.all) _list.removeWhere((r) => r.id == rowId);
    if (alsoResolved > 0 && mounted) {
      showSnack(context, 'Өмнө оноосон данс, утсаар өөр $alsoResolved гүйлгээ автоматаар орлоо');
    }
    unawaited(_list.refresh());
  }

  void _imported(ImportSummary s) {
    setState(() => _lastImport = s);
    unawaited(_list.refresh());
  }

  @override
  Widget build(BuildContext context) {
    return DataListScreen<BankRow>(
      controller: _list,
      load: _load,
      reloadKey: _checkOnly,
      itemKey: (r) => r.id,
      filters: _filters,
      searchHint: 'Гүйлгээний утга эсвэл дүнгээр хайх',
      countLabel: (n) => '$n гүйлгээ',
      header: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          ReconcileStatusCard(onImported: _imported, onChanged: () => unawaited(_list.refresh())),
          if (_lastImport != null) ...[
            const SizedBox(height: AppSpace.sm),
            AppCard(
              key: const Key('import-summary'),
              padding: const EdgeInsets.all(AppSpace.md),
              child: Text(_lastImport!.text, style: context.text.bodyMedium),
            ),
          ],
        ],
      ),
      summaryBuilder: (context, snap) => _Summary(
        lane: Lane.fromApi(snap.query.filter),
        checkOnly: _checkOnly,
        onCheckOnly: (v) => setState(() => _checkOnly = v),
      ),
      itemPadding: const EdgeInsets.all(AppSpace.md),
      itemBuilder: (_, r) => RowCard(row: r, onDone: _done),
      emptyTitle: Lane.all.empty,
      emptyMessage: 'Хаан банкны интернэт банкнаас «Дансны хуулга»-г Excel-ээр татаж оруулна',
      emptyIcon: AppIcons.bank,
    );
  }
}

/// Жагсаалтын дээр наалдах хэсэг: «Шийтэд хөтлөгдсөн»-д Бүгд/Шалгах, бусдад өнгөний тайлбар («i»).
class _Summary extends ConsumerWidget {
  const _Summary({required this.lane, required this.checkOnly, required this.onCheckOnly});

  final Lane lane;
  final bool checkOnly;
  final ValueChanged<bool> onCheckOnly;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final o = ref.watch(reconcileOverviewProvider).value;
    if (lane == Lane.sheet && o != null && o.sheetCheck > 0) {
      return SegmentedButton<bool>(
        key: const Key('sheet-check'),
        showSelectedIcon: false,
        segments: [
          ButtonSegment(value: false, label: Text('Бүгд (${o.count(Lane.sheet)})')),
          ButtonSegment(value: true, label: Text('Шалгах (${o.sheetCheck})')),
        ],
        selected: {checkOnly},
        onSelectionChanged: (v) => onCheckOnly(v.first),
      );
    }
    if (lane != Lane.all) return const SizedBox.shrink();
    return Row(
      children: [
        Expanded(child: Text('Өнгө нь гүйлгээний төлөвийг заана', style: context.text.bodySmall)),
        InfoHint(
          title: 'Өнгөний тайлбар',
          message: [
            for (final t in [RowTone.auto, RowTone.open, RowTone.other, RowTone.expense, RowTone.sheet])
              '${toneColorName(t)} — ${t == RowTone.auto ? 'Сургалтын төлбөр' : t.label}',
          ].join('\n'),
        ),
      ],
    );
  }
}

/// Тайлбарт өнгийг үгээр нэрлэнэ (өнгө дангаараа утга илэрхийлэхгүй).
String toneColorName(RowTone t) => switch (t) {
  RowTone.auto || RowTone.done => 'Ногоон',
  RowTone.open => 'Улбар шар',
  RowTone.other => 'Цэнхэр',
  RowTone.expense => 'Улаан',
  RowTone.sheet => 'Саарал',
};

Color toneColor(BuildContext context, RowTone t) {
  final c = context.colors;
  return switch (t) {
    RowTone.auto || RowTone.done => c.success,
    RowTone.open => c.warning,
    RowTone.other => c.info,
    RowTone.expense => c.error,
    RowTone.sheet => c.inkDim,
  };
}

/// Дээд хэсэг: хэдэн гүйлгээ шийдвэр хүлээж байгаа, хуулга хэдий хүртэл орсон, хуулга оруулах,
/// «Шийтэд хөтлөгдсөн өдөр», шийтэд бичих горим.
class ReconcileStatusCard extends ConsumerStatefulWidget {
  const ReconcileStatusCard({super.key, required this.onImported, required this.onChanged});

  final ValueChanged<ImportSummary> onImported;

  /// «Шийтэд хөтлөгдсөн өдөр» тэмдэглэсэн — жагсаалтыг шинэчилнэ.
  final VoidCallback onChanged;

  @override
  ConsumerState<ReconcileStatusCard> createState() => _ReconcileStatusCardState();
}

class _ReconcileStatusCardState extends ConsumerState<ReconcileStatusCard> {
  bool _importing = false;
  String? _error;

  Future<void> _import(StatementPicker picker) async {
    setState(() => _error = null);
    final PickedStatement? picked;
    try {
      picked = await picker.pick();
    } catch (_) {
      if (mounted) setState(() => _error = 'Файлыг нээж чадсангүй');
      return;
    }
    if (picked == null || !mounted) return;
    final file = StatementPreview.inspect(picked.name, picked.bytes);
    if (!file.ok) {
      setState(() => _error = file.problem);
      return;
    }
    setState(() => _importing = true);
    try {
      final res = await ref
          .read(financeSubmitGuardProvider)
          .run('reconcile:import', () => ref.read(reconcileRepositoryProvider).importStatement(picked!.bytes, file));
      if (!mounted) return;
      if (res == null) {
        setState(() => _error = busyMessage);
        return;
      }
      showSnack(context, '${res.newRows} шинэ гүйлгээ орлоо');
      widget.onImported(res);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e, 'Хуулга оруулж чадсангүй. Дахин оролдоно уу'));
    } finally {
      if (mounted) setState(() => _importing = false);
    }
  }

  Future<void> _sheetThrough(BankCursor cursor) async {
    final marked = await showLedgerSheet<int>(
      context,
      (_) => SheetThroughSheet(initial: cursor.sheetThrough ?? cursor.coveredThrough),
    );
    if (marked == null || !mounted) return;
    showSnack(context, '$marked гүйлгээ «Шийтэд хөтлөгдсөн» жагсаалт руу шилжлээ');
    widget.onChanged();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final picker = ref.watch(statementPickerProvider);
    final async = ref.watch(reconcileOverviewProvider);
    final o = async.value;
    if (o == null && async.hasError) {
      return ErrorState(
        message: async.error is ApiError ? (async.error! as ApiError).message : AppStrings.genericError,
        onRetry: () => ref.invalidate(reconcileOverviewProvider),
      );
    }
    if (o == null) return const SkeletonPulse(child: SkeletonCard());
    final cursor = o.cursor;
    final manual = o.count(Lane.manual);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        AppCard(
          key: const Key('reconcile-status'),
          padding: const EdgeInsets.all(AppSpace.lg),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.calendarCheck, color: c.success),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          cursor == null
                              ? 'Хуулга хараахан ороогүй'
                              : manual > 0
                              ? '$manual гүйлгээ таны шийдвэрийг хүлээж байна'
                              : 'Бүх гүйлгээ шийдэгдсэн',
                          style: context.text.titleSmall,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          cursor == null
                              ? 'Хаан банкны интернэт банкнаас «Дансны хуулга»-г Excel-ээр татаж оруулна'
                              : 'Хуулга ${lf.dayLabel(cursor.coveredThrough)} хүртэл орсон. Шинэ хуулга оруулахад '
                                    'давхардалгүй, зөвхөн шинэ гүйлгээ нэмэгдэнэ',
                          style: context.text.bodySmall?.copyWith(color: c.inkDim),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpace.md),
              if (picker == null)
                Text(
                  'Энэ төхөөрөмж дээр файл сонгох боломжгүй байна',
                  key: const Key('statement-import-unavailable'),
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                )
              else
                FilledButton.icon(
                  key: const Key('statement-pick'),
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                  onPressed: _importing ? null : () => unawaited(_import(picker)),
                  icon: const Icon(AppIcons.cloudUpload, size: 18),
                  label: Text(_importing ? 'Уншиж байна' : 'Хуулга оруулах'),
                ),
              if (_error != null) ...[
                const SizedBox(height: AppSpace.sm),
                Text(
                  _error!,
                  key: const Key('statement-error'),
                  style: context.text.bodyMedium?.copyWith(color: c.error),
                ),
              ],
              if (cursor != null) ...[
                const SizedBox(height: AppSpace.md),
                Divider(height: 1, color: c.line),
                const SizedBox(height: AppSpace.md),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(AppIcons.document, size: 18, color: c.info),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Text(
                        cursor.sheetThrough != null
                            ? '${lf.dayLabel(cursor.sheetThrough)} хүртэл ажилтан шийтэд гараар бичсэн. Түүнээс хойших '
                                  'гүйлгээг систем шийтэд өөрөө бичнэ'
                            : 'Ажилтан шийтэд гараар бичсэн сүүлийн өдрийг тэмдэглэнэ үү — түүнээс хойших гүйлгээг '
                                  'систем шийтэд бичнэ',
                        style: context.text.bodySmall,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpace.sm),
                OutlinedButton(
                  key: const Key('sheet-through'),
                  style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                  onPressed: () => unawaited(_sheetThrough(cursor)),
                  child: Text(cursor.sheetThrough != null ? 'Өдрийг өөрчлөх' : 'Шийтэд хөтлөгдсөн өдөр'),
                ),
              ],
            ],
          ),
        ),
        if (o.sheetWriteDemo != null) ...[
          const SizedBox(height: AppSpace.sm),
          AppCard(
            key: const Key('sheet-write'),
            padding: const EdgeInsets.all(AppSpace.md),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(AppIcons.document, size: 18, color: c.info),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: o.sheetWriteDemo! ? 'Демо горим. ' : 'Шийтэд автоматаар бичнэ. ',
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                        TextSpan(
                          text: o.sheetWriteDemo!
                              ? 'Гараар оноосон сургалтын төлбөр жинхэнэ шийтэд биш, тусдаа хуулбарт бичигдэнэ'
                              : 'Гараар оноосон сургалтын төлбөр «2027 оны төлбөрийн мэдээлэл»-д бичигдэнэ — ажилтан '
                                    'дахин бичихгүй',
                        ),
                      ],
                    ),
                    style: context.text.bodySmall,
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

/// «Шийтэд хөтлөгдсөн өдөр» — тэр өдрийг хүртэлх, систем тулгаж чадаагүй гүйлгээг ажилтан шийтэд аль хэдийн
/// бүртгэсэн гэж үзээд «Шийдэх»-ээс нууна. Тэмдэглэсэн бол шилжүүлсэн тоо.
class SheetThroughSheet extends ConsumerStatefulWidget {
  const SheetThroughSheet({super.key, this.initial});

  final String? initial;

  @override
  ConsumerState<SheetThroughSheet> createState() => _SheetThroughSheetState();
}

class _SheetThroughSheetState extends ConsumerState<SheetThroughSheet> {
  late String? _date = widget.initial;
  bool _busy = false;
  String? _error;

  Future<void> _pick() async {
    final today = ref.read(financeTodayProvider);
    final last = DateTime(today.year, today.month, today.day);
    var initial = DateTime.tryParse(_date ?? '') ?? last;
    if (initial.isAfter(last)) initial = last;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2024),
      lastDate: last,
    );
    if (picked == null || !mounted) return;
    String p(int x) => x.toString().padLeft(2, '0');
    setState(() => _date = '${picked.year}-${p(picked.month)}-${p(picked.day)}');
  }

  Future<void> _save() async {
    final date = _date;
    if (date == null) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final marked = await ref
          .read(financeSubmitGuardProvider)
          .run('reconcile:sheet-through', () => ref.read(reconcileRepositoryProvider).markSheetThrough(date));
      if (!mounted) return;
      if (marked == null) {
        setState(() => _error = busyMessage);
        return;
      }
      Navigator.of(context).pop(marked);
    } catch (e) {
      if (mounted) setState(() => _error = errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return LedgerSheetFrame(
      title: 'Шийтэд хөтлөгдсөн өдөр',
      subtitle: 'Энэ өдрийг хүртэлх, систем тулгаж чадаагүй гүйлгээг ажилтан шийтэд аль хэдийн бүртгэсэн гэж үзээд «Шийдэх»-ээс нууна',
      error: _error,
      footer: SheetPrimaryButton(
        key: const Key('sheet-through-save'),
        label: 'Тэмдэглэх',
        busy: _busy,
        onPressed: _date == null ? null : () => unawaited(_save()),
      ),
      children: [
        SheetField(
          label: 'Хүртэлх өдөр',
          hint: 'Тэдгээр гүйлгээ «Шийтэд хөтлөгдсөн» жагсаалтад харагдана. Шийтэд ижил дүнтэй бүртгэл олдоогүйг «шалгана уу» гэж тэмдэглэнэ',
          child: OutlinedButton.icon(
            key: const Key('sheet-through-date'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(AppSizes.minTap),
              alignment: Alignment.centerLeft,
            ),
            onPressed: _busy ? null : () => unawaited(_pick()),
            icon: const Icon(AppIcons.calendar, size: 18),
            label: Text(_date == null ? 'Сонгох' : _date!.replaceAll('-', '.')),
          ),
        ),
      ],
    );
  }
}

/// Банкны нэг гүйлгээ: шийдэгдээгүй бол санал + товч, шийдэгдсэн бол хуваарилалт + «Буцаах».
class RowCard extends ConsumerStatefulWidget {
  const RowCard({super.key, required this.row, required this.onDone});

  final BankRow row;

  /// Мөр шийдэгдсэн/буцаагдсан; хоёр дахь нь сурсан данс/утсаар нэмж шийдэгдсэн тоо.
  final void Function(String rowId, [int alsoResolved]) onDone;

  @override
  ConsumerState<RowCard> createState() => _RowCardState();
}

class _RowCardState extends ConsumerState<RowCard> {
  bool _busy = false;

  BankRow get _r => widget.row;

  Future<T?> _guarded<T>(Future<T> Function() action) async {
    setState(() => _busy = true);
    try {
      final res = await ref.read(financeSubmitGuardProvider).run('reconcile:${_r.id}', action);
      if (res == null && mounted) showSnack(context, busyMessage);
      return res;
    } catch (e) {
      if (mounted) showSnack(context, errorText(e));
      return null;
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _quick(List<AllocPart> parts) async {
    final res = await _guarded(() => ref.read(reconcileRepositoryProvider).allocate(_r.id, parts));
    if (res == null || !mounted) return;
    showSnack(context, allocatedText(res));
    widget.onDone(_r.id, res.alsoResolved);
  }

  Future<void> _allocate() async {
    final res = await showAllocateSheet(context, _r);
    if (res == null || !mounted) return;
    showSnack(context, allocatedText(res));
    widget.onDone(_r.id, res.alsoResolved);
  }

  Future<void> _undo() async {
    if (!await confirmUndo(context) || !mounted) return;
    final ok = await _guarded(() => ref.read(reconcileRepositoryProvider).undo(_r.id).then((_) => true));
    if (ok == null || !mounted) return;
    showSnack(context, 'Буцаалаа — «Шийдэх» жагсаалтад орлоо');
    widget.onDone(_r.id);
  }

  void _detail(Candidate cand) => unawaited(
    showStudentDetail(
      context,
      cand.studentId,
      onPick: _r.canQuickKid
          ? () => unawaited(_quick([AllocPart(kind: _r.kidKind, amount: _r.amount, studentId: cand.studentId)]))
          : null,
      onChanged: () => widget.onDone(_r.id),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final r = _r;
    final c = context.colors;
    final s = r.suggestion;
    final tone = r.tone;
    final main = r.parts.main;
    final textPhones = phonesInText(r.description);
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    Widget note(IconData icon, Color color, String text) => Padding(
      padding: const EdgeInsets.only(top: AppSpace.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 6),
          Expanded(child: Text(text, style: dim)),
        ],
      ),
    );
    return Column(
      key: ValueKey('row:${r.id}'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: Text(
                '${r.debit ? '-' : ''}${formatMnt(r.amount)}',
                style: context.text.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                  color: r.debit ? c.error : c.ink,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
            ExcludeSemantics(
              child: SizedBox.square(
                dimension: 8,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: toneColor(context, tone), shape: BoxShape.circle),
                ),
              ),
            ),
            const SizedBox(width: 6),
            Flexible(
              child: Text(
                tone.label,
                key: ValueKey('tone:${r.id}'),
                style: context.text.labelSmall?.copyWith(fontWeight: FontWeight.w700),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: AppSpace.sm),
            Text(lf.stampLabel(r.bookedAt), style: dim),
          ],
        ),
        const SizedBox(height: AppSpace.xs),
        Text(
          main.isEmpty ? 'Утгагүй гүйлгээ' : main,
          style: main.isEmpty
              ? context.text.bodyMedium?.copyWith(color: c.inkDim)
              : context.text.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
        ),
        PayerInfo(row: r),
        if (r.open && s != null) ...[
          const SizedBox(height: AppSpace.sm),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.xs,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              MetaChip(label: s.kindLabel, tone: s.kind.isTuition ? ChipTone.brand : ChipTone.neutral),
              if (s.showReason) Text(s.reason, style: dim),
              if (!r.debit &&
                  s.split == null &&
                  decisionHints[s.decision] != null &&
                  (s.kind.isTuition || s.candidates.isNotEmpty))
                Text(decisionHints[s.decision]!, style: dim),
            ],
          ),
          if (s.unrecorded)
            note(AppIcons.document, c.info, 'Шийтэд бүртгэгдээгүй — батлахад шинэ төлбөр болж нэмэгдэнэ'),
          if (s.hiddenPaidUp > 0)
            note(
              AppIcons.success,
              c.success,
              'Жилийн төлбөрөө бүрэн төлсөн ${s.hiddenPaidUp} хүүхдийг санал болгосонгүй',
            ),
          if (s.decision == 'SPLIT') note(AppIcons.students, c.info, 'Хэд хэдэн хүүхдийн нэр бий — хувааж онооно'),
          if (r.canQuickKid && s.candidates.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            for (final cand in s.candidates)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.xs),
                child: _CandidateButton(
                  candidate: cand,
                  textPhones: textPhones,
                  busy: _busy,
                  onPick: () =>
                      unawaited(_quick([AllocPart(kind: r.kidKind, amount: r.amount, studentId: cand.studentId)])),
                  onMore: () => _detail(cand),
                ),
              ),
          ],
        ],
        if (r.inSheet)
          note(
            AppIcons.document,
            r.sheetMissing ? c.error : c.info,
            r.sheetMissing
                ? 'Шийтэд байгааг баталж чадсангүй (энэ хүүхдэд ижил дүнтэй бүртгэл олдсонгүй) — шалгана уу'
                : 'Ажилтан шийтэд хөтөлсөн',
          ),
        if (!r.open && !r.inSheet)
          for (final a in r.allocations)
            Padding(
              key: ValueKey('alloc:${a.id}'),
              padding: const EdgeInsets.only(top: AppSpace.xs),
              child: Wrap(
                spacing: AppSpace.sm,
                runSpacing: 2,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  MetaChip(label: a.kindLabel, tone: a.kind.isTuition ? ChipTone.brand : ChipTone.neutral),
                  if (a.student != null) Meta(items: [a.student!.name, a.student!.classroom]),
                  if (r.allocations.length > 1) Text(formatMnt(a.amount), style: dim),
                  if (a.kind.isTuition) Text(r.sheetNote(a.studentId, inSheet: a.inSheet), style: dim),
                  if (a.auto) Text('Автоматаар', style: dim),
                ],
              ),
            ),
        const SizedBox(height: AppSpace.sm),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            if (r.needsSplit)
              FilledButton.icon(
                key: ValueKey('split:${r.id}'),
                style: FilledButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
                onPressed: _busy ? null : () => unawaited(_allocate()),
                icon: const Icon(AppIcons.students, size: 18),
                label: const Text('Хуваах'),
              ),
            if (r.nonKidKind != null)
              FilledButton.tonalIcon(
                key: ValueKey('confirm-kind:${r.id}'),
                style: FilledButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
                onPressed: _busy ? null : () => unawaited(_quick([AllocPart(kind: r.nonKidKind!, amount: r.amount)])),
                icon: const Icon(AppIcons.check, size: 18),
                label: Text('${s!.kindLabel} гэж батлах'),
              ),
            if (r.open)
              OutlinedButton(
                key: ValueKey('allocate:${r.id}'),
                style: OutlinedButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
                onPressed: _busy ? null : () => unawaited(_allocate()),
                child: Text((s?.candidates.isNotEmpty ?? false) ? 'Өөрөөр хуваарилах' : 'Хүүхэд хайж оноох'),
              ),
            if (!r.open)
              TextButton.icon(
                key: ValueKey('undo:${r.id}'),
                style: TextButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
                onPressed: _busy ? null : () => unawaited(_undo()),
                icon: const Icon(AppIcons.undo, size: 18),
                label: Text(r.inSheet ? 'Буцааж шийдэх' : 'Буцаах'),
              ),
            if (r.open && s == null)
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(AppIcons.warning, size: 16, color: c.inkDim),
                  const SizedBox(width: 4),
                  Text('Санал алга', style: dim),
                ],
              ),
          ],
        ),
      ],
    );
  }
}

/// Санал болгосон хүүхэд: нэг товшилтоор батлах + «⋯». Гүйлгээний утганд бичигдсэн утас тодорно.
class _CandidateButton extends StatelessWidget {
  const _CandidateButton({
    required this.candidate,
    required this.textPhones,
    required this.busy,
    required this.onPick,
    required this.onMore,
  });

  final Candidate candidate;
  final Set<String> textPhones;
  final bool busy;
  final VoidCallback onPick;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final st = candidate.student;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    return DecoratedBox(
      key: ValueKey('cand:${candidate.studentId}'),
      decoration: BoxDecoration(
        border: Border.all(color: c.line),
        borderRadius: BorderRadius.circular(AppRadius.md),
      ),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              borderRadius: const BorderRadius.horizontal(left: Radius.circular(AppRadius.md)),
              onTap: busy ? null : onPick,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(AppIcons.check, size: 16, color: c.success),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Meta(
                              items: [st?.name ?? 'Хүүхэд', st?.classroom, if (st?.archived ?? false) 'Гарсан'],
                            ),
                          ),
                        ],
                      ),
                      Meta(
                        items: [
                          candidate.signalText,
                          if (candidate.sheetPays.isNotEmpty)
                            'Шийтэд ${candidate.sheetPays.map((x) => formatMnt(x.amount)).join(', ')}',
                        ],
                      ),
                      if (st != null && st.phones.isNotEmpty)
                        Wrap(
                          spacing: AppSpace.md,
                          children: [
                            for (final p in st.phones)
                              if (textPhones.contains(p.value))
                                Row(
                                  key: ValueKey('phone-hit:${p.value}'),
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(
                                      '${p.label} ${p.value}',
                                      style: context.text.bodySmall?.copyWith(
                                        color: c.success,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    const SizedBox(width: 2),
                                    Icon(AppIcons.check, size: 14, color: c.success, semanticLabel: 'утганд бичигдсэн'),
                                  ],
                                )
                              else
                                Text('${p.label} ${p.value}', style: dim),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ),
          MoreButton(name: st?.name ?? 'Хүүхэд', onPressed: onMore),
        ],
      ),
    );
  }
}
