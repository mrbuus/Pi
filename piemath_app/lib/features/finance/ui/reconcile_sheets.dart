import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../application/finance_providers.dart';
import '../application/statement_picker.dart';
import '../application/submit_guard.dart';
import '../data/reconcile_models.dart';
import '../data/reconcile_repository.dart';
import 'finance_widgets.dart';

String _errorText(Object e, [String fallback = MutationResult.saveFailedMessage]) =>
    e is ApiError ? e.message : fallback;

const _busyMessage = 'Өмнөх хүсэлт явж байна, түр хүлээнэ үү';

/// Гүйлгээний дэлгэрэнгүй (утсан дээр доороос гарах цонх). Өөрчлөгдсөн бол шинэ гүйлгээ, хаавал `null`.
Future<BankTransaction?> showTransactionSheet(BuildContext context, BankTransaction transaction) =>
    showModalBottomSheet<BankTransaction>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (ctx) => SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          AppSpace.gutter,
          0,
          AppSpace.gutter,
          AppSpace.xl + MediaQuery.paddingOf(ctx).bottom,
        ),
        child: TransactionDetail(transaction: transaction, onChanged: (t) => Navigator.of(ctx).pop(t)),
      ),
    );

/// Гүйлгээний баримт + үйлдэл (зөвхөн тулгаагүйд): сурагчтай холбох, «Төлбөр биш».
///
/// Үйлдэл бүр: баталгаажуулалт (дүнтэй) → [SubmitGuard] (давхар дарахаас) → сервер. Алдаа гарвал
/// автоматаар ДАХИН ИЛГЭЭХГҮЙ — мессеж харуулж, хэрэглэгч өөрөө шийднэ.
class TransactionDetail extends ConsumerStatefulWidget {
  const TransactionDetail({super.key, required this.transaction, required this.onChanged});

  final BankTransaction transaction;
  final ValueChanged<BankTransaction> onChanged;

  @override
  ConsumerState<TransactionDetail> createState() => _TransactionDetailState();
}

class _TransactionDetailState extends ConsumerState<TransactionDetail> {
  late BankTransaction _t = widget.transaction;
  bool _busy = false;
  String? _error;

  Future<void> _run(String what, Future<BankTransaction> Function() action) async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final done = await ref.read(financeSubmitGuardProvider).run('reconcile:${_t.id}', action);
      if (!mounted) return;
      if (done == null) {
        setState(() => _error = _busyMessage);
        return;
      }
      setState(() => _t = done);
      ScaffoldMessenger.maybeOf(context)
        ?..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(what)));
      widget.onChanged(done);
    } catch (e) {
      if (mounted) setState(() => _error = _errorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _match() async {
    final student = await showStudentPicker(context);
    if (student == null || !mounted) return;
    final ok = await confirmAction(
      context,
      title: 'Сурагчтай холбох уу',
      message: [
        'Гүйлгээ: ${formatMnt(_t.amount)}',
        'Сурагч: ${student.fullName}${student.code == null ? '' : ' (${student.code})'}',
        'Сурагчид хүлээгдэж буй төлбөр үүснэ. Төлбөрийг баталгаажуулах нь тусдаа алхам',
      ].join('\n'),
      confirmLabel: 'Холбох',
      destructive: false,
    );
    if (!ok || !mounted) return;
    final repo = ref.read(reconcileRepositoryProvider);
    await _run('Гүйлгээг ${student.fullName}-тэй холболоо', () => repo.match(_t.id, student.id));
  }

  Future<void> _ignore() async {
    final ok = await confirmAction(
      context,
      title: 'Төлбөр биш гэж тэмдэглэх үү',
      message:
          '${formatMnt(_t.amount)} гүйлгээг тулгалтаас гаргана. Гүйлгээ устахгүй, «Төлбөр биш» шүүлтүүрт харагдана',
      confirmLabel: 'Тэмдэглэх',
      destructive: false,
    );
    if (!ok || !mounted) return;
    final repo = ref.read(reconcileRepositoryProvider);
    await _run('«Төлбөр биш» гэж тэмдэглэлээ', () async {
      await repo.ignore(_t.id);
      return _t.copyWith(status: BankMatchStatus.ignored);
    });
  }

  @override
  Widget build(BuildContext context) {
    final t = _t;
    final c = context.colors;
    final user = t.matchedUser;
    return Column(
      key: ValueKey('tx-detail:${t.id}'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                formatMnt(t.amount),
                style: context.text.headlineSmall?.copyWith(fontFamily: AppTheme.displayFont),
              ),
            ),
            BankStatusChip(t.status),
          ],
        ),
        const SizedBox(height: AppSpace.md),
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              FactRow(label: 'Огноо', value: momentLabel(t.bookedAt)),
              if (t.description.isNotEmpty) FactRow(label: 'Гүйлгээний утга', value: t.description, selectable: true),
              FactRow(label: 'Банкны дугаар', value: t.bankRef, selectable: true),
              if (t.counterparty != null) FactRow(label: 'Харилцагч', value: t.counterparty!, selectable: true),
              if (t.accountNo != null) FactRow(label: 'Данс', value: t.accountNo!, selectable: true),
            ],
          ),
        ),
        if (user != null) ...[
          const SectionHeader(title: 'Холбогдсон сурагч'),
          AppCard(
            child: ItemRow(
              leading: Icon(AppIcons.user, color: c.inkDim),
              title: user.fullName,
              meta: [user.phone],
            ),
          ),
        ],
        if (_error != null) ...[
          const SizedBox(height: AppSpace.md),
          Text(
            _error!,
            key: const Key('tx-error'),
            style: context.text.bodyMedium?.copyWith(color: c.error),
          ),
        ],
        if (t.actionable) ...[
          const SizedBox(height: AppSpace.lg),
          FilledButton.icon(
            key: const Key('tx-match'),
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
            onPressed: _busy ? null : () => unawaited(_match()),
            icon: const Icon(AppIcons.link, size: 18),
            label: Text(_busy ? 'Хүлээнэ үү' : 'Сурагчтай холбох'),
          ),
          const SizedBox(height: AppSpace.sm),
          OutlinedButton.icon(
            key: const Key('tx-ignore'),
            style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
            onPressed: _busy ? null : () => unawaited(_ignore()),
            icon: const Icon(AppIcons.ban, size: 18),
            label: const Text('Төлбөр биш'),
          ),
        ],
      ],
    );
  }
}

/// Сурагч сонгох (нэр, сурагчийн код, нэвтрэх нэрээр). Сонгосон сурагч, хаавал `null`.
Future<StudentHit?> showStudentPicker(BuildContext context) => showModalBottomSheet<StudentHit>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (_) => const StudentPickerSheet(),
);

class StudentPickerSheet extends ConsumerStatefulWidget {
  const StudentPickerSheet({super.key});

  @override
  ConsumerState<StudentPickerSheet> createState() => _StudentPickerSheetState();
}

class _StudentPickerSheetState extends ConsumerState<StudentPickerSheet> {
  final _query = TextEditingController();
  Timer? _debounce;
  List<StudentHit> _hits = const [];
  bool _searching = false;
  String? _error;
  int _seq = 0;

  @override
  void dispose() {
    _debounce?.cancel();
    _query.dispose();
    super.dispose();
  }

  void _changed(String text) {
    _debounce?.cancel();
    final q = text.trim();
    setState(() {
      _error = null;
      if (q.length < 2) {
        _hits = const [];
        _searching = false;
      }
    });
    if (q.length >= 2) _debounce = Timer(const Duration(milliseconds: 250), () => unawaited(_search(q)));
  }

  Future<void> _search(String q) async {
    final seq = ++_seq;
    setState(() => _searching = true);
    try {
      final hits = await ref.read(reconcileRepositoryProvider).searchStudents(q);
      if (!mounted || seq != _seq) return;
      setState(() {
        _hits = hits;
        _searching = false;
      });
    } catch (e) {
      if (!mounted || seq != _seq) return;
      setState(() {
        _searching = false;
        _error = _errorText(e, 'Хайлт амжилтгүй боллоо');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final q = _query.text.trim();
    final empty = q.length >= 2 && !_searching && _error == null && _hits.isEmpty;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.8,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Сурагч сонгох', style: context.text.titleMedium),
                  const SizedBox(height: AppSpace.md),
                  TextField(
                    key: const Key('student-search'),
                    controller: _query,
                    autofocus: true,
                    textInputAction: TextInputAction.search,
                    decoration: const InputDecoration(
                      prefixIcon: Icon(AppIcons.search),
                      labelText: 'Нэр эсвэл сурагчийн кодоор хайх',
                      hintText: 'Дор хаяж 2 тэмдэгт',
                    ),
                    onChanged: _changed,
                  ),
                  const SizedBox(height: AppSpace.sm),
                  if (_searching) const LinearProgressIndicator(minHeight: 2),
                  if (_error != null) Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
                  if (empty)
                    Text('Тохирох сурагч олдсонгүй', style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                itemCount: _hits.length,
                itemBuilder: (_, i) {
                  final h = _hits[i];
                  return ListTile(
                    key: ValueKey('student:${h.id}'),
                    minTileHeight: 56,
                    leading: const Icon(AppIcons.user),
                    title: Text(h.fullName),
                    subtitle: Text(h.code ?? h.username ?? 'Кодгүй'),
                    onTap: () => Navigator.of(context).pop(h),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Хуулга оруулах карт. Файл сонгогч байхгүй бол (апп-д сан багцлагдаагүй) оруулах боломжгүйг тайлбарлана.
///
/// Урсгал: сонгох → урьдчилсан шалгалт ([StatementPreview], серверт илгээхээс өмнө) → баталгаажуулах →
/// нэг л илгээлт ([SubmitGuard], автомат давталтгүй) → серверийн дүн (оруулсан, давхардсан, холбогдсон, алдаа).
class StatementImportCard extends ConsumerStatefulWidget {
  const StatementImportCard({super.key, required this.onImported});

  final VoidCallback onImported;

  @override
  ConsumerState<StatementImportCard> createState() => _StatementImportCardState();
}

class _StatementImportCardState extends ConsumerState<StatementImportCard> {
  bool _busy = false;
  String? _error;
  ImportResult? _result;

  Future<void> _pickAndImport(StatementPicker picker) async {
    setState(() {
      _error = null;
      _result = null;
    });
    final PickedStatement? picked;
    try {
      picked = await picker.pick();
    } catch (_) {
      if (mounted) setState(() => _error = 'Файлыг нээж чадсангүй');
      return;
    }
    if (picked == null || !mounted) return;
    final preview = StatementPreview.inspect(picked.name, picked.bytes);
    final ok = await showStatementPreview(context, preview);
    if (!ok || !mounted || !preview.ok) return;
    setState(() => _busy = true);
    try {
      final repo = ref.read(reconcileRepositoryProvider);
      final result = await ref
          .read(financeSubmitGuardProvider)
          .run('reconcile:import', () => repo.importStatement(picked!.bytes, preview));
      if (!mounted) return;
      if (result == null) {
        setState(() => _error = _busyMessage);
        return;
      }
      setState(() => _result = result);
      ref.invalidate(reconcileSummaryProvider);
      widget.onImported();
    } catch (e) {
      if (mounted) setState(() => _error = _errorText(e, 'Хуулга оруулж чадсангүй. Дахин оролдоно уу'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final picker = ref.watch(statementPickerProvider);
    final c = context.colors;
    final result = _result;
    return AppCard(
      key: const Key('statement-import'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(AppIcons.cloudUpload, color: c.inkDim),
              const SizedBox(width: AppSpace.sm),
              Expanded(child: Text('Банкны хуулга оруулах', style: context.text.titleSmall)),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          if (picker == null)
            Text(
              'Энэ төхөөрөмж дээр файл сонгох боломжгүй байна',
              key: const Key('statement-import-unavailable'),
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            )
          else ...[
            Text(
              'Хаан банкны .xlsx эсвэл .csv хуулга, 5 МБ хүртэл',
              style: context.text.bodySmall?.copyWith(color: c.inkDim),
            ),
            const SizedBox(height: AppSpace.md),
            FilledButton.tonalIcon(
              key: const Key('statement-pick'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
              onPressed: _busy ? null : () => unawaited(_pickAndImport(picker)),
              icon: const Icon(AppIcons.document, size: 18),
              label: Text(_busy ? 'Оруулж байна' : 'Хуулга сонгох'),
            ),
          ],
          if (_busy) ...[const SizedBox(height: AppSpace.sm), const LinearProgressIndicator(minHeight: 2)],
          if (_error != null) ...[
            const SizedBox(height: AppSpace.sm),
            Text(
              _error!,
              key: const Key('statement-error'),
              style: context.text.bodyMedium?.copyWith(color: c.error),
            ),
          ],
          if (result != null) ...[const SizedBox(height: AppSpace.md), ImportResultView(result: result)],
        ],
      ),
    );
  }
}

/// Илгээхээс өмнөх урьдчилсан шалгалт. Илгээх бол `true`.
Future<bool> showStatementPreview(BuildContext context, StatementPreview p) async {
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: true,
    builder: (ctx) {
      final c = ctx.colors;
      final khan = p.hasKhanHeader;
      return SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          AppSpace.gutter,
          0,
          AppSpace.gutter,
          AppSpace.xl + MediaQuery.paddingOf(ctx).bottom,
        ),
        child: Column(
          key: const Key('statement-preview'),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Хуулга шалгах', style: ctx.text.titleMedium),
            const SizedBox(height: AppSpace.md),
            FactRow(label: 'Файл', value: p.name),
            FactRow(label: 'Төрөл, хэмжээ', value: '${p.kindLabel}, ${p.sizeLabel}'),
            if (p.lineCount > 0) FactRow(label: 'Мөр', value: '${p.lineCount}'),
            if (p.problem != null) ...[
              const SizedBox(height: AppSpace.sm),
              Text(
                p.problem!,
                key: const Key('statement-problem'),
                style: ctx.text.bodyMedium?.copyWith(color: c.error),
              ),
            ],
            if (p.ok && khan == false) ...[
              const SizedBox(height: AppSpace.sm),
              Row(
                children: [
                  Icon(AppIcons.warning, size: 16, color: c.warning),
                  const SizedBox(width: AppSpace.xs),
                  Expanded(
                    child: Text(
                      'Хаан банкны толгой («${StatementPreview.khanHeader}») олдсонгүй — сервер мөрүүдийг алгасаж магадгүй',
                      style: ctx.text.bodySmall,
                    ),
                  ),
                ],
              ),
            ],
            if (p.sampleLines.isNotEmpty) ...[
              const SizedBox(height: AppSpace.md),
              Text('Эхний мөрүүд', style: ctx.text.labelMedium?.copyWith(color: c.inkDim)),
              const SizedBox(height: AppSpace.xs),
              AppCard(
                padding: const EdgeInsets.all(AppSpace.md),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Text(p.sampleLines.join('\n'), style: ctx.text.bodySmall),
                ),
              ),
            ],
            const SizedBox(height: AppSpace.lg),
            FilledButton(
              key: const Key('statement-submit'),
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
              onPressed: p.ok ? () => Navigator.of(ctx).pop(true) : null,
              child: const Text('Оруулах'),
            ),
            const SizedBox(height: AppSpace.sm),
            TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text(AppStrings.cancel)),
          ],
        ),
      );
    },
  );
  return ok ?? false;
}

/// Серверийн импортын дүн.
class ImportResultView extends StatelessWidget {
  const ImportResultView({super.key, required this.result});

  final ImportResult result;

  @override
  Widget build(BuildContext context) {
    final r = result;
    final c = context.colors;
    return Column(
      key: const Key('import-result'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(AppIcons.fileCheck, size: 18, color: c.success),
            const SizedBox(width: AppSpace.xs),
            Expanded(child: Text('Хуулга оруулсан', style: context.text.titleSmall)),
          ],
        ),
        const SizedBox(height: AppSpace.xs),
        Meta(
          items: [
            '${r.totalRows} мөр',
            '${r.imported} шинэ',
            '${r.matched} автоматаар холбогдсон',
            if (r.skipped > 0) '${r.skipped} алгассан',
          ],
        ),
        if (r.errors.isNotEmpty) ...[
          const SizedBox(height: AppSpace.sm),
          Text('${r.errors.length} мөрд алдаа', style: context.text.bodyMedium?.copyWith(color: c.error)),
          for (final e in r.errors.take(10))
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                '${e.rowIndex}-р мөр${e.bankRef == null ? '' : ' (${e.bankRef})'}: ${e.reason}',
                style: context.text.bodySmall,
              ),
            ),
          if (r.errors.length > 10)
            Text('бусад ${r.errors.length - 10} алдаа', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
        ],
      ],
    );
  }
}
