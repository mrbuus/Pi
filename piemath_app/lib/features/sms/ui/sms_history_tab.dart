import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/sms_models.dart';
import '../data/sms_repository.dart';

/// Илгээсэн мессежийн түүх — серверийн хуудаслалт (`skip`/`take`), төлвөөр шүүх, утсаар хайх.
/// Амжилтгүй мессежийг Админ дахин илгээнэ (баталгаажуулсны дараа, давхар дарахаас хамгаална).
class SmsHistoryTab extends ConsumerStatefulWidget {
  const SmsHistoryTab({super.key, required this.canRetry});

  final bool canRetry;

  static const pageSize = 20;

  @override
  ConsumerState<SmsHistoryTab> createState() => _SmsHistoryTabState();
}

class _SmsHistoryTabState extends ConsumerState<SmsHistoryTab> {
  final _list = DataListController<SmsMessage>();
  final _retrying = <String>{};

  /// Энэ сешнд амжилттай дахин илгээсэн мөр. Сервер ШИНЭ мессеж үүсгэж хуучныг `FAILED` хэвээр үлдээдэг тул
  /// товчийг дахин харуулбал нэг хүнд давхар SMS (мөнгө) явж болно.
  final _retried = <String>{};

  static final _filters = [
    for (final s in [SmsMessageStatus.sent, SmsMessageStatus.failed, SmsMessageStatus.queued])
      DataFilter(s.apiValue, s.label),
  ];

  Future<DataPage<SmsMessage>> _load(DataQuery q) async {
    final skip = int.tryParse(q.cursor ?? '') ?? 0;
    final page = await ref
        .read(smsRepositoryProvider)
        .messages(
          status: q.filter == null ? null : SmsMessageStatus.fromApi(q.filter),
          phone: q.search,
          skip: skip,
          take: SmsHistoryTab.pageSize,
        );
    final next = skip + page.messages.length;
    return DataPage(
      items: page.messages,
      total: page.total,
      nextCursor: page.messages.isNotEmpty && next < page.total ? '$next' : null,
    );
  }

  Future<void> _retry(SmsMessage m) async {
    if (_retrying.contains(m.id) || _retried.contains(m.id)) return;
    final ok = await confirmAction(
      context,
      title: 'Дахин илгээх үү',
      message: '${m.toPhone} дугаар руу ${m.segments} хэсэг SMS дахин илгээнэ',
      confirmLabel: 'Илгээх',
      destructive: false,
    );
    if (!ok || !mounted || _retrying.contains(m.id) || _retried.contains(m.id)) return;
    setState(() => _retrying.add(m.id));
    try {
      await ref.read(smsRepositoryProvider).retry(m.id);
      if (!mounted) return;
      setState(() => _retried.add(m.id));
      _snack('Дахин илгээлээ');
      await _list.refresh();
    } catch (e) {
      _snack(e is ApiError ? e.message : 'Дахин илгээж чадсангүй');
      // Сервер шинэ алдааг мөрөнд бичсэн — жагсаалтыг шинэчилнэ.
      if (mounted) await _list.refresh();
    } finally {
      if (mounted) setState(() => _retrying.remove(m.id));
    }
  }

  void _snack(String text) {
    if (!mounted) return;
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    return DataListScreen<SmsMessage>(
      controller: _list,
      load: _load,
      itemKey: (m) => m.id,
      searchHint: 'Утасны дугаараар хайх',
      filters: _filters,
      countLabel: (n) => '$n мессеж',
      itemBuilder: (_, m) => _MessageRow(
        message: m,
        retrying: _retrying.contains(m.id),
        retried: _retried.contains(m.id),
        onRetry: widget.canRetry && m.status == SmsMessageStatus.failed && !_retried.contains(m.id)
            ? () => _retry(m)
            : null,
      ),
      emptyIcon: AppIcons.message,
      emptyTitle: 'Мессеж алга',
      emptyMessage: 'Энэ шүүлтүүрт мессеж олдсонгүй',
    );
  }
}

class _MessageRow extends StatelessWidget {
  const _MessageRow({required this.message, required this.retrying, this.retried = false, this.onRetry});

  final SmsMessage message;
  final bool retrying;
  final bool retried;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final m = message;
    final tone = switch (m.status) {
      SmsMessageStatus.sent => ChipTone.success,
      SmsMessageStatus.failed => ChipTone.error,
      SmsMessageStatus.queued => ChipTone.warning,
      _ => ChipTone.neutral,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            MetaChip(label: m.status.label, tone: tone),
            const SizedBox(width: AppSpace.sm),
            Expanded(
              child: Meta(
                items: [
                  m.toPhone,
                  if (m.createdAt != null) DateMn.numericWithTime(UbDateTime.fromInstant(m.createdAt!)),
                  '${m.segments} хэсэг',
                  if (retried) 'дахин илгээсэн',
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        Text(m.body, style: context.text.bodyMedium),
        if (m.error != null) ...[
          const SizedBox(height: AppSpace.xs),
          Text(m.error!, style: context.text.bodySmall?.copyWith(color: context.colors.error)),
        ],
        if (onRetry != null) ...[
          const SizedBox(height: AppSpace.sm),
          Align(
            alignment: AlignmentDirectional.centerEnd,
            child: SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: retrying ? null : onRetry,
                icon: retrying
                    ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(AppIcons.retry, size: 18),
                label: const Text('Дахин илгээх'),
              ),
            ),
          ),
        ],
      ],
    );
  }
}
