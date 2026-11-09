import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/format/person_name.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../application/finance_providers.dart';
import '../application/submit_guard.dart';
import '../data/finance_models.dart';
import '../data/finance_repository.dart';
import 'finance_widgets.dart';

/// `/app/admin/finance` — санхүүгийн тайлан (вэбийн `FinanceDashboardClient`): сар сонгох, орлого ба
/// зарлагын задаргаа, цэвэр ашиг, өмнөх сартай харьцуулалт, зарлагын бүртгэл (нэмэх, засах).
///
/// Зөвхөн Админ. Бүх дүн серверийнх — апп нийлбэр, ашиг тооцохгүй. Зарлага устгах нь серверт хатуу
/// устгал тул энд харагдахгүй.
class FinanceScreen extends ConsumerWidget {
  const FinanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allowed = ref.watch(financeAccessProvider);
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: const Text('Санхүү'),
        actions: [
          if (allowed)
            IconButton(
              key: const Key('expense-add-top'),
              tooltip: 'Зарлага нэмэх',
              icon: const Icon(AppIcons.add),
              onPressed: () => openExpenseForm(context, ref, month: ref.read(financeMonthProvider)),
            ),
        ],
      ),
      body: allowed ? const FinanceBody() : const FinanceDenied(message: 'Санхүүгийн тайланг зөвхөн Админ харна'),
    );
  }
}

class FinanceBody extends ConsumerWidget {
  const FinanceBody({super.key});

  Future<void> _refresh(WidgetRef ref, YearMonth month) async {
    ref
      ..invalidate(financeReportProvider(month))
      ..invalidate(financeExpensesProvider(month));
    await Future.wait([ref.read(financeReportProvider(month).future), ref.read(financeExpensesProvider(month).future)])
        .catchError((_) => const <Object>[]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final month = ref.watch(financeMonthProvider);
    final report = ref.watch(financeReportProvider(month));
    final expenses = ref.watch(financeExpensesProvider(month));
    final c = context.colors;
    const pad = EdgeInsets.symmetric(horizontal: AppSpace.gutter);
    return RefreshIndicator(
      color: c.brand,
      backgroundColor: c.surface,
      onRefresh: () => _refresh(ref, month),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
            sliver: SliverToBoxAdapter(child: _MonthSwitcher(month: month)),
          ),
          ...report.when(
            loading: () => [const SliverToBoxAdapter(child: LoadingState(cards: 3))],
            error: (e, _) => [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpace.xl),
                  child: ErrorState(
                    message: e is ApiError ? e.message : AppStrings.genericError,
                    onRetry: () => ref.invalidate(financeReportProvider(month)),
                  ),
                ),
              ),
            ],
            data: (r) => [
              SliverPadding(
                padding: pad,
                sliver: SliverToBoxAdapter(child: FinanceReportView(report: r)),
              ),
            ],
          ),
          SliverPadding(
            padding: pad,
            sliver: SliverToBoxAdapter(
              child: SectionHeader(
                title: 'Зарлагын бүртгэл',
                trailing: FilledButton.tonalIcon(
                  key: const Key('expense-add'),
                  onPressed: () => openExpenseForm(context, ref, month: month),
                  style: FilledButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                  icon: const Icon(AppIcons.add, size: 18),
                  label: const Text('Нэмэх'),
                ),
              ),
            ),
          ),
          ...expenses.when(
            loading: () => [
              const SliverToBoxAdapter(
                child: Padding(
                  padding: pad,
                  child: SkeletonPulse(child: SkeletonCard()),
                ),
              ),
            ],
            error: (e, _) => [
              SliverToBoxAdapter(
                child: ErrorState(
                  message: e is ApiError ? e.message : AppStrings.genericError,
                  onRetry: () => ref.invalidate(financeExpensesProvider(month)),
                ),
              ),
            ],
            data: (list) => list.isEmpty
                ? [
                    const SliverToBoxAdapter(
                      child: EmptyState(icon: AppIcons.receipt, title: 'Энэ сарын зарлага алга'),
                    ),
                  ]
                : [
                    SliverPadding(
                      padding: pad,
                      sliver: SliverList.separated(
                        itemCount: list.length,
                        separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                        itemBuilder: (_, i) => ExpenseTile(
                          expense: list[i],
                          onTap: () => openExpenseForm(context, ref, month: month, existing: list[i]),
                        ),
                      ),
                    ),
                  ],
          ),
          SliverToBoxAdapter(child: SizedBox(height: AppSpace.xxl + MediaQuery.paddingOf(context).bottom)),
        ],
      ),
    );
  }
}

class _MonthSwitcher extends ConsumerWidget {
  const _MonthSwitcher({required this.month});

  final YearMonth month;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final notifier = ref.read(financeMonthProvider.notifier);
    return Row(
      children: [
        IconButton(
          key: const Key('finance-prev-month'),
          tooltip: 'Өмнөх сар',
          constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
          onPressed: notifier.previous,
          icon: const Icon(AppIcons.arrowLeft),
        ),
        Expanded(
          child: Semantics(
            liveRegion: true,
            child: Text(month.label, textAlign: TextAlign.center, style: context.text.titleMedium),
          ),
        ),
        IconButton(
          key: const Key('finance-next-month'),
          tooltip: 'Дараагийн сар',
          constraints: const BoxConstraints(minWidth: AppSizes.minTap, minHeight: AppSizes.minTap),
          onPressed: notifier.next,
          icon: const Icon(AppIcons.arrowRight),
        ),
      ],
    );
  }
}

/// Тайлангийн хэсэг: гол 3 тоо, орлого, зарлага, цэвэр ашиг.
class FinanceReportView extends StatelessWidget {
  const FinanceReportView({super.key, required this.report});

  final FinanceReport report;

  @override
  Widget build(BuildContext context) {
    final r = report;
    final c = context.colors;
    final change = r.profitChange;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: AppSpace.sm),
        StatRow(
          tiles: [
            StatTile(
              label: 'Орлого',
              value: formatMnt(r.totalIncome),
              icon: AppIcons.trendingUp,
              tone: ChipTone.success,
            ),
            StatTile(
              label: 'Зарлага',
              value: formatMnt(r.totalExpenses),
              icon: AppIcons.trendingDown,
              tone: ChipTone.error,
            ),
            StatTile(
              label: 'Цэвэр ашиг',
              value: formatMnt(r.netProfit),
              icon: AppIcons.chart,
              tone: r.netProfit > 0
                  ? ChipTone.success
                  : r.netProfit < 0
                  ? ChipTone.error
                  : ChipTone.neutral,
            ),
          ],
        ),
        const SectionHeader(title: 'Орлого'),
        AppCard(
          key: const Key('finance-income'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final l in r.incomeLines) MoneyRow(label: l.label, amount: l.amount),
              Divider(color: c.line, height: AppSpace.lg),
              MoneyRow(label: 'Нийт орлого', amount: r.totalIncome, strong: true),
              if (r.totalIncome > 0) ...[const SizedBox(height: AppSpace.md), BreakdownBar(lines: r.incomeLines)],
              if (r.reconciliationRequired > 0) ...[
                const SizedBox(height: AppSpace.md),
                Row(
                  children: [
                    Icon(AppIcons.info, size: 16, color: c.inkDim),
                    const SizedBox(width: AppSpace.xs),
                    Expanded(
                      child: Text(
                        '${r.reconciliationRequired} төлбөрийн ангилал тодорхойгүй тул «Бусад»-д орсон',
                        style: context.text.bodySmall,
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SectionHeader(title: 'Зарлага'),
        AppCard(
          key: const Key('finance-expenses'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final l in r.expenseLines) MoneyRow(label: l.label, amount: l.amount),
              Divider(color: c.line, height: AppSpace.lg),
              MoneyRow(label: 'Нийт зарлага', amount: r.totalExpenses, strong: true),
              if (r.totalExpenses > 0) ...[const SizedBox(height: AppSpace.md), BreakdownBar(lines: r.expenseLines)],
            ],
          ),
        ),
        const SectionHeader(title: 'Цэвэр ашиг'),
        AppCard(
          key: const Key('finance-profit'),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                formatMnt(r.netProfit),
                style: context.text.headlineSmall?.copyWith(fontFamily: AppTheme.displayFont),
              ),
              if (change != null && r.previousNetProfit != null) ...[
                const SizedBox(height: AppSpace.sm),
                Row(
                  children: [
                    Icon(
                      change >= 0 ? AppIcons.trendingUp : AppIcons.trendingDown,
                      size: 16,
                      color: change > 0
                          ? c.success
                          : change < 0
                          ? c.error
                          : c.inkDim,
                    ),
                    const SizedBox(width: AppSpace.xs),
                    Expanded(
                      child: Text(
                        'Өмнөх сартай харьцуулбал ${change > 0 ? '+' : ''}${formatMnt(change)}',
                        style: context.text.bodySmall,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpace.xs),
                Text('Өмнөх сарын цэвэр ашиг ${formatMnt(r.previousNetProfit!)}', style: context.text.bodySmall),
              ],
            ],
          ),
        ),
      ],
    );
  }
}

/// Зарлагын мөр — дарахад засах маягт.
class ExpenseTile extends StatelessWidget {
  const ExpenseTile({super.key, required this.expense, required this.onTap});

  final ExpenseRecord expense;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final e = expense;
    final author = staffName(firstName: e.createdBy.firstName, lastName: e.createdBy.lastName, role: e.createdBy.role);
    return AppCard(
      key: ValueKey('expense:${e.id}'),
      onTap: onTap,
      padding: const EdgeInsets.all(AppSpace.md),
      child: ItemRow(
        title: e.categoryLabel,
        meta: [dayLabel(e.occurredOn), if (author.isNotEmpty) 'Бүртгэсэн $author'],
        subtitle: e.description == null ? null : Text(e.description!, maxLines: 3, overflow: TextOverflow.ellipsis),
        trailing: Text(
          formatMnt(e.amount),
          style: context.text.titleSmall?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
        ),
        chevron: true,
      ),
    );
  }
}

/// Зарлага нэмэх (`existing == null`) эсвэл засах маягт. Хадгалахаас өмнө дүнг заасан баталгаажуулалт,
/// давхар илгээлтээс [SubmitGuard]. Амжилттай бол тайлан ба жагсаалтыг серверээс дахин ачаална.
Future<void> openExpenseForm(
  BuildContext context,
  WidgetRef ref, {
  required YearMonth month,
  ExpenseRecord? existing,
}) async {
  final today = ref.read(financeTodayProvider).startOfDay;
  final defaultDay = YearMonth.of(today) == month ? today : UbDateTime(month.year, month.month);
  final creating = existing == null;
  YearMonth? savedMonth;
  final saved = await showFormSheet<bool>(
    context,
    title: creating ? 'Зарлага нэмэх' : 'Зарлага засах',
    submitLabel: creating ? 'Нэмэх' : AppStrings.save,
    fields: [
      FormMoneyField(name: 'amount', label: 'Дүн', initial: existing?.amount, required: true, min: 0),
      FormSelectField<ExpenseCategory>(
        name: 'category',
        label: 'Ангилал',
        required: true,
        initial: existing == null ? ExpenseCategory.salary : existing.category,
        options: [for (final c in ExpenseCategory.values) SelectOption(c, c.label)],
      ),
      FormDateField(name: 'occurredOn', label: 'Огноо', required: true, initial: existing?.occurredOn ?? defaultDay),
      FormTextField(name: 'description', label: 'Тайлбар', hint: 'Сонголтоор', initial: existing?.description),
    ],
    onSubmit: (v) async {
      final draft = ExpenseDraft(
        amount: v.integer('amount')!,
        category: v.get<ExpenseCategory>('category')!,
        occurredOn: v.date('occurredOn')!,
        description: v.text('description'),
      );
      await submitExpense(context, ref, draft: draft, existing: existing);
      savedMonth = YearMonth.of(draft.occurredOn);
      return true;
    },
  );
  if (saved == true) {
    ref
      ..invalidate(financeReportProvider(month))
      ..invalidate(financeExpensesProvider(month));
    final target = savedMonth;
    if (target != null && target != month) {
      ref
        ..invalidate(financeReportProvider(target))
        ..invalidate(financeExpensesProvider(target));
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(creating ? 'Зарлага нэмэгдлээ' : 'Зарлага хадгалагдлаа')));
    }
  }
}

/// Баталгаажуулалтын бичвэр (дүн, ангилал, огноо). Засварт өмнөх дүнг ч харуулна.
String expenseConfirmMessage(ExpenseDraft draft, ExpenseRecord? existing) {
  final lines = <String>[
    if (existing != null && existing.amount != draft.amount) ...[
      'Өмнөх дүн: ${formatMnt(existing.amount)}',
      'Шинэ дүн: ${formatMnt(draft.amount)}',
    ] else
      'Дүн: ${formatMnt(draft.amount)}',
    'Ангилал: ${draft.category.label}',
    'Огноо: ${dayLabel(draft.occurredOn)}',
    if (draft.description.trim().isNotEmpty) 'Тайлбар: ${draft.description.trim()}',
  ];
  return lines.join('\n');
}

/// Баталгаажуулалт → [SubmitGuard] → сервер. Болих эсвэл давхар дарвал хадгалахгүй (маягт нээлттэй үлдэнэ).
Future<void> submitExpense(
  BuildContext context,
  WidgetRef ref, {
  required ExpenseDraft draft,
  ExpenseRecord? existing,
}) async {
  final ok = await confirmAction(
    context,
    title: existing == null ? 'Зарлага нэмэх үү' : 'Зарлагыг өөрчлөх үү',
    message: expenseConfirmMessage(draft, existing),
    confirmLabel: existing == null ? 'Нэмэх' : AppStrings.save,
    destructive: false,
  );
  if (!ok) throw const ApiError(ApiErrorKind.badRequest, 'Баталгаажуулаагүй тул хадгалсангүй');
  final repo = ref.read(financeRepositoryProvider);
  final done = await ref.read(financeSubmitGuardProvider).run(
    existing == null ? 'expense:new' : 'expense:${existing.id}',
    () async {
      if (existing == null) {
        await repo.createExpense(draft);
      } else {
        await repo.updateExpense(existing.id, draft);
      }
      return true;
    },
  );
  if (done == null) throw const ApiError(ApiErrorKind.conflict, 'Өмнөх хүсэлт явж байна, түр хүлээнэ үү');
}
