import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/payment_status/money.dart';
import '../data/book_money_models.dart';
import '../data/book_money_repository.dart';
import '../domain/book_money_logic.dart';
import 'book_mark_sheet.dart';

String _when(DateTime? t) {
  if (t == null) return '';
  final u = UbDateTime.fromInstant(t);
  String two(int n) => n.toString().padLeft(2, '0');
  return '${two(u.month)}.${two(u.day)} ${DateMn.time(u)}';
}

/// Сурагчийн хуудасны «Ном» таб (вэбийн `BooksTab`, эзэн 2026-11-12) — ном бүрийн мөнгийг өгсөн эсэх,
/// аль ангид байхдаа, аль багшид, хэдийг. Ангийн чекээс гадуур эндээс шууд тэмдэглэж болно. Доор нь
/// бүх өөрчлөлтийн түүх (юу ч устахгүй). Өгөгдлөө өөрөө ачаална — `StudentScreen`-ий таб болгон залгана.
class StudentBooksTab extends ConsumerStatefulWidget {
  const StudentBooksTab({super.key, required this.studentId});

  final String studentId;

  @override
  ConsumerState<StudentBooksTab> createState() => _StudentBooksTabState();
}

class _StudentBooksTabState extends ConsumerState<StudentBooksTab> {
  String? _busyKey;

  Future<void> _save(String bookKey, BookMarkInput input) async {
    await ref.read(bookMoneyRepositoryProvider).set(widget.studentId, bookKey, input);
    ref.invalidate(studentBooksProvider(widget.studentId));
    ref.invalidate(bookDashboardProvider);
  }

  void _openSheet(StudentBooks data, StudentBookRow b) {
    final p = b.payment;
    showBookMarkSheet(
      context,
      target: BookSheetTarget(
        studentId: widget.studentId,
        studentName: data.name,
        bookTitle: b.title,
        price: b.suggestedAmount,
        status: p?.status,
        amount: p?.amount,
        collectedBy: p?.collectedBy,
        note: p?.note,
        classrooms: data.classrooms,
        classroomId: p != null ? p.classroomId : data.currentClassroomId,
      ),
      onSave: (input) async {
        await _save(b.key, input);
        if (mounted) bookSnack(context, 'Хадгаллаа');
      },
    );
  }

  /// Шууд дарах: санал болгох үнэтэй бол тэр дүнгээр, өөрөө авсан гэж; үгүй бол дэлгэрэнгүйг нээнэ.
  Future<void> _quick(StudentBooks data, StudentBookRow b) async {
    if (!quickMarks(b)) return _openSheet(data, b);
    setState(() => _busyKey = b.key);
    try {
      await _save(b.key, BookMarkInput.paid(amount: b.suggestedAmount!));
      if (mounted) bookSnack(context, '${b.title}, өгсөн гэж тэмдэглэлээ');
    } catch (e) {
      if (mounted) bookSnack(context, bookError(e));
    } finally {
      if (mounted) setState(() => _busyKey = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = studentBooksProvider(widget.studentId);
    final async = ref.watch(provider);
    return async.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(cards: 4),
      error: (e, _) => ErrorState(
        message: bookError(e, 'Номын мэдээллийг ачаалж чадсангүй'),
        onRetry: () => ref.invalidate(provider),
      ),
      data: (data) => RefreshIndicator(
        onRefresh: () => ref.refresh(provider.future),
        child: ListView(
          padding: const EdgeInsets.all(AppSpace.gutter),
          children: [
            TitledCard(
              title: 'Ном, шалгалтын хуудас',
              icon: AppIcons.theory,
              child: Column(
                children: [
                  for (var i = 0; i < data.books.length; i++) ...[
                    if (i > 0) const Divider(height: 1),
                    _BookRowTile(
                      book: data.books[i],
                      busy: _busyKey == data.books[i].key,
                      onQuick: () => _quick(data, data.books[i]),
                      onMore: () => _openSheet(data, data.books[i]),
                    ),
                  ],
                ],
              ),
            ),
            if (data.history.isNotEmpty) ...[
              const SizedBox(height: AppSpace.lg),
              TitledCard(
                title: 'Түүх',
                icon: AppIcons.history,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (var i = 0; i < data.history.length; i++) ...[
                      if (i > 0) const Divider(height: AppSpace.lg),
                      _HistoryTile(row: data.history[i]),
                    ],
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _BookRowTile extends StatelessWidget {
  const _BookRowTile({required this.book, required this.busy, required this.onQuick, required this.onMore});

  final StudentBookRow book;
  final bool busy;
  final VoidCallback onQuick;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final p = book.payment;
    final paid = p?.paid ?? false;
    final skipped = p?.skipped ?? false;
    final dim = context.text.bodySmall?.copyWith(color: c.inkDim);
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 56),
      child: Row(
        children: [
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: AppSpace.sm,
                    crossAxisAlignment: WrapCrossAlignment.end,
                    children: [
                      Text(book.title, style: context.text.titleSmall),
                      if (paid && p!.amount != null)
                        Text(
                          formatMnt(p.amount!),
                          style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                        ),
                      if (p == null && book.suggestedAmount != null)
                        Text(
                          formatMnt(book.suggestedAmount!),
                          style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                        ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  if (busy)
                    Text('Хадгалж байна', style: dim)
                  else if (p != null)
                    Meta(
                      items: [
                        if (skipped) 'Авахгүй',
                        ...paymentFacts(p),
                        '${p.createdBy?.display ?? 'Хэн нэгэн'} ${_when(p.createdAt)}',
                      ],
                    )
                  else
                    Text('Өгөөгүй', style: dim),
                ],
              ),
            ),
          ),
          IconButton(
            tooltip: '${book.title}, дэлгэрэнгүй: авсан багш, дүн',
            onPressed: onMore,
            icon: Icon(AppIcons.overflow, color: c.inkDim),
          ),
          Semantics(
            button: true,
            toggled: paid,
            label: '${book.title}, ${paid ? 'өгсөн, засах' : 'өгсөн гэж тэмдэглэх'}',
            child: InkResponse(
              key: Key('book-quick-${book.key}'),
              onTap: busy ? null : onQuick,
              radius: 28,
              child: SizedBox(
                width: 64,
                height: 56,
                child: Center(
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 150),
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: paid ? c.success : null,
                      border: Border.all(color: paid ? c.success : c.line, width: 2),
                    ),
                    child: Icon(
                      paid
                          ? AppIcons.check
                          : skipped
                          ? AppIcons.ban
                          : AppIcons.add,
                      size: 20,
                      color: paid ? c.onStatus : c.inkDim,
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  const _HistoryTile({required this.row});

  final BookPayment row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final voided = row.voided;
    final title = [
      row.title ?? row.bookKey,
      if (row.paid && row.amount != null) formatMnt(row.amount!),
      if (row.skipped) 'авахгүй',
    ].join(', ');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: context.text.titleSmall?.copyWith(
            color: voided ? c.inkDim : null,
            decoration: voided ? TextDecoration.lineThrough : null,
          ),
        ),
        const SizedBox(height: 2),
        Meta(
          items: [...paymentFacts(row), '${row.createdBy?.display ?? 'Хэн нэгэн'} тэмдэглэсэн ${_when(row.createdAt)}'],
        ),
        if (voided)
          Text(
            '${row.voidedBy?.display ?? 'Хэн нэгэн'} өөрчилсөн ${_when(row.voidedAt)}',
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
          ),
      ],
    );
  }
}
