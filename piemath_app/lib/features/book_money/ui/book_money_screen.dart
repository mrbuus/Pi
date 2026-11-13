import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/money.dart';
import '../data/book_money_models.dart';
import '../data/book_money_repository.dart';
import '../domain/book_money_logic.dart';
import 'book_mark_sheet.dart';

/// «Дотоод, Номын мөнгө» (`/app/book-money`, вэбийн `BookMoneyDashboard`, эзэн 2026-11-12): ном бүрээр
/// аль анги авсан, хэдэн хүүхэд өгсөн, багш тус бүр хэдийг хураасан. Бүх багш (Багш ч) бүх дүнг
/// харна — сургалтын төлбөрийн дүрэм номын мөнгөнд хамаарахгүй (сервер `seeAllMoney: true`).
class BookMoneyScreen extends ConsumerWidget {
  const BookMoneyScreen({super.key});

  static const path = '/app/book-money';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(bookDashboardProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Номын мөнгө')),
      body: async.when(
        skipLoadingOnRefresh: true,
        loading: () => const LoadingState(cards: 4),
        error: (e, _) => ErrorState(
          message: bookError(e, 'Номын мөнгөний мэдээллийг ачаалж чадсангүй'),
          onRetry: () => ref.invalidate(bookDashboardProvider),
        ),
        data: (d) => RefreshIndicator(
          onRefresh: () => ref.refresh(bookDashboardProvider.future),
          child: d.books.isEmpty
              ? ListView(
                  children: const [
                    SizedBox(
                      height: 420,
                      child: EmptyState(
                        icon: AppIcons.theory,
                        title: 'Номын чек нээгдээгүй байна',
                        message: 'Ангийн самбарын «Чек» хэсгээс номоо сонгож нээхэд энд нэгдэн гарна',
                      ),
                    ),
                  ],
                )
              : ListView(
                  padding: const EdgeInsets.all(AppSpace.gutter),
                  children: [
                    Text(
                      'Аль анги ямар ном авсан, хэдэн хүүхэд мөнгөө өгсөн, хэн хураасан',
                      style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                    ),
                    const SizedBox(height: AppSpace.lg),
                    if (d.collectors.isNotEmpty) ...[
                      _CollectorsCard(collectors: d.collectors),
                      const SizedBox(height: AppSpace.lg),
                    ],
                    for (final b in d.books) ...[_BookCard(book: b), const SizedBox(height: AppSpace.lg)],
                  ],
                ),
        ),
      ),
    );
  }
}

class _CollectorsCard extends StatelessWidget {
  const _CollectorsCard({required this.collectors});

  final List<CollectorTotal> collectors;

  @override
  Widget build(BuildContext context) {
    final dim = context.text.bodySmall?.copyWith(color: context.colors.inkDim);
    return TitledCard(
      title: 'Багш тус бүрийн хураасан',
      icon: AppIcons.payments,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < collectors.length; i++) ...[
            if (i > 0) const Divider(height: AppSpace.lg),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(collectors[i].person?.display ?? 'Тодорхойгүй', style: context.text.titleSmall),
                      const SizedBox(height: 2),
                      Meta(
                        items: [
                          for (final b in collectors[i].byBook) '${b.title} ${b.count} хүүхэд, ${formatMnt(b.sum)}',
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(formatMnt(collectors[i].sum), style: context.text.titleMedium),
                    Text('${collectors[i].count} хүүхэд', style: dim),
                  ],
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _BookCard extends StatelessWidget {
  const _BookCard({required this.book});

  final BookSection book;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(book.title, style: context.text.titleMedium),
          const SizedBox(height: 2),
          Meta(
            items: [
              '${book.paid} хүүхэд өгсөн',
              if (book.collected != null) formatMnt(book.collected!),
              if (book.noClassPaid > 0) 'ангигүй ${book.noClassPaid}',
            ],
          ),
          const SizedBox(height: AppSpace.md),
          for (var i = 0; i < book.classes.length; i++) ...[
            if (i > 0) const SizedBox(height: AppSpace.sm),
            _ClassRowTile(row: book.classes[i]),
          ],
        ],
      ),
    );
  }
}

class _ClassRowTile extends StatelessWidget {
  const _ClassRowTile({required this.row});

  final BookClassRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final pr = classProgress(row);
    final body = Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm + 2),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: AppSpace.sm,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(row.name.isEmpty ? 'Анги' : row.name, style: context.text.titleSmall),
                    if (row.price != null)
                      Text(formatMnt(row.price!), style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                    if (row.hidden)
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(AppIcons.hide, size: 14, color: c.inkDim),
                          const SizedBox(width: 4),
                          Text('нуусан', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: AppSpace.xs + 2),
                if (row.checkId != null) ...[
                  ClipRRect(
                    borderRadius: BorderRadius.circular(AppRadius.pill),
                    child: LinearProgressIndicator(
                      value: pr.pct / 100,
                      minHeight: 6,
                      color: c.success,
                      backgroundColor: c.surfaceSunken,
                      semanticsLabel: '${pr.done}/${pr.due} өгсөн',
                    ),
                  ),
                  const SizedBox(height: AppSpace.xs),
                  Meta(
                    items: [
                      Text(
                        '${pr.done}/${pr.due} өгсөн, ${pr.pct}%',
                        style: context.text.bodySmall?.copyWith(color: c.ink, fontWeight: FontWeight.w600),
                      ),
                      if (row.left > 0)
                        Text(
                          '${row.left} үлдсэн',
                          style: context.text.bodySmall?.copyWith(color: c.warning, fontWeight: FontWeight.w600),
                        ),
                      if (row.paidElsewhere > 0) '${row.paidElsewhere} нь өөр ангид төлсөн',
                      if (row.skipped > 0) '${row.skipped} авахгүй',
                      if (row.formerPaid > 0) 'гарсан ${row.formerPaid} хүүхэд өгсөн',
                      if (row.collected != null) formatMnt(row.collected!),
                    ],
                  ),
                ] else
                  Meta(
                    items: [
                      'Чек нээгээгүй',
                      '${row.paidHere + row.formerPaid} хүүхэд өгсөн',
                      if (row.collected != null) formatMnt(row.collected!),
                    ],
                  ),
              ],
            ),
          ),
          if (!row.classArchived) ...[
            const SizedBox(width: AppSpace.xs),
            Icon(AppIcons.forward, size: 18, color: c.inkDim),
          ],
        ],
      ),
    );
    final shape = RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(AppRadius.md),
      side: BorderSide(color: c.line),
    );
    return Material(
      color: c.surface,
      shape: shape,
      clipBehavior: Clip.antiAlias,
      child: row.classArchived
          ? body
          : InkWell(onTap: () => context.push('/app/classes/${Uri.encodeComponent(row.classroomId)}'), child: body),
    );
  }
}
