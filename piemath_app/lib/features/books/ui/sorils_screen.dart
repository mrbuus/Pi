import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/books_models.dart';
import '../data/books_repository.dart';
import 'books_common.dart';

/// Жишиг сорил (`/sorils`, нэвтрэлтгүй) — `GET /catalog/mock-exams`.
///
/// Апп-д: явагдаж буй, дараагийн, удахгүй болох сорил, сүүлийн сорилын дүн. Бүртгүүлэх, сорил
/// өгөх нь шалгалтын урсгал (M4) — одоогоор вэбээр.
class SorilsScreen extends ConsumerWidget {
  const SorilsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mockExamsProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Жишиг сорил')),
      body: async.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => publicError(e, onRetry: () => ref.invalidate(mockExamsProvider)),
        data: (m) => RefreshIndicator(
          onRefresh: () => ref.refresh(mockExamsProvider.future),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
            children: [
              Text(
                'Долоо хоног бүрийн онлайн жишиг сорил: ЭЕШ-ийн бүтэцтэй, хугацаатай, дүн, байр шууд',
                style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
              ),
              if (m.isEmpty) ...[
                const SizedBox(height: AppSpace.xl),
                const EmptyState(
                  icon: BooksIcons.mock,
                  title: 'Товлосон сорил одоогоор алга',
                  message: 'Шинэ сорил товлогдмогц энд харагдана',
                ),
              ],
              if (m.live != null) ...[
                const SectionHeader(title: 'Одоо явагдаж байна'),
                _EventCard(event: m.live!),
              ],
              if (m.next != null && m.next!.id != m.live?.id) ...[
                const SectionHeader(title: 'Дараагийн сорил'),
                _EventCard(event: m.next!),
              ],
              if (m.upcoming.where((e) => e.id != m.next?.id && e.id != m.live?.id).isNotEmpty) ...[
                const SectionHeader(title: 'Удахгүй'),
                for (final e in m.upcoming.where((e) => e.id != m.next?.id && e.id != m.live?.id)) ...[
                  _EventCard(event: e),
                  const SizedBox(height: AppSpace.md),
                ],
              ],
              if (m.last != null) ...[
                const SectionHeader(title: 'Өмнөх сорил'),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(m.last!.title, style: context.text.titleSmall),
                      const SizedBox(height: AppSpace.xs),
                      Meta(
                        items: [
                          if (m.last!.startsAt != null) DateMn.long(UbDateTime.fromInstant(m.last!.startsAt!)),
                          '${m.last!.participants} оролцогч',
                          if (m.last!.avgPct != null) 'дундаж ${m.last!.avgPct!.round()}%',
                        ],
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: AppSpace.xl),
              OutlinedButton.icon(
                icon: const Icon(AppIcons.forward, size: 18),
                label: const Text('Вэбээр бүртгүүлэх'),
                onPressed: () => openWeb('/sorils'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// «Ням, 10-р сарын 18, 11:00» (вэбийн `fmtUb`).
String formatEventTime(DateTime instant) {
  final t = UbDateTime.fromInstant(instant);
  return '${DateMn.longWithWeekday(t).split(', ').reversed.join(', ')}, ${DateMn.time(t)}';
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event});

  final MockEvent event;

  @override
  Widget build(BuildContext context) {
    final live = event.phase == 'live';
    return AppCard(
      accent: live ? context.colors.success : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(event.title, style: context.text.titleSmall),
          const SizedBox(height: AppSpace.xs),
          Text(formatEventTime(event.startsAt), style: context.text.bodyMedium),
          const SizedBox(height: AppSpace.xs),
          Meta(
            items: [
              if (event.timeLimitMin != null) '${event.timeLimitMin} минут',
              '${event.problemCount} бодлого',
              '${event.registered} бүртгүүлсэн',
            ],
          ),
          if (event.note != null && event.note!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Text(event.note!, style: context.text.bodySmall),
          ],
        ],
      ),
    );
  }
}
