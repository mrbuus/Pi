import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/books_models.dart';
import '../data/books_repository.dart';
import 'books_common.dart';

/// Жишиг сорил (`/sorils`, нэвтрэлтгүй) — `GET /catalog/mock-exams` (вэбийн `SorilsClient`).
///
/// Явагдаж буй, дараагийн, удахгүй болох сорил, сүүлийн сорилын дүн. Сурагч, худалдан авагч апп дотроос
/// бүртгүүлж (`POST /mock-exams/:id/register`), эхлэх цагт шалгалтын хөдөлгүүрээр (`/app/tests/:id`) өгнө.
/// Нэвтрээгүй бол апп доторх нэвтрэх, бүртгүүлэх рүү (`?next=/sorils`).
class SorilsScreen extends ConsumerStatefulWidget {
  const SorilsScreen({super.key});

  @override
  ConsumerState<SorilsScreen> createState() => _SorilsScreenState();
}

class _SorilsScreenState extends ConsumerState<SorilsScreen> {
  String? _busy;
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    // Сорил эхлэх, дуусах мөчид товч солигдоно.
    _ticker = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Future<void> _act(MockEvent ev, bool on) async {
    if (_busy != null) return;
    setState(() => _busy = ev.id);
    final messenger = ScaffoldMessenger.of(context);
    try {
      await setMockRegistration(ref, ev.id, on: on);
      ref
        ..invalidate(myMockRegistrationsProvider)
        ..invalidate(mockExamsProvider);
      messenger.showSnackBar(
        SnackBar(content: Text(on ? 'Бүртгүүллээ, цагтаа энэ хуудаснаас эхлүүлээрэй' : 'Бүртгэлийг цуцаллаа')),
      );
    } on ApiError catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(mockExamsProvider);
    final session = ref.watch(sessionProvider);
    final loggedIn = session is SignedIn;
    final canRegister = session is SignedIn && (session.role == UserRole.student || session.role == UserRole.buyer);
    final regs = canRegister ? (ref.watch(myMockRegistrationsProvider).value ?? const <MockRegistration>[]) : const <MockRegistration>[];
    final now = DateTime.now();
    Widget card(MockEvent e) => _EventCard(
          event: e,
          action: _EventAction(
            event: e,
            now: now,
            reg: regs.where((r) => r.eventId == e.id).firstOrNull,
            canRegister: canRegister,
            loggedIn: loggedIn,
            busy: _busy == e.id,
            onAct: (on) => _act(e, on),
          ),
        );
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Жишиг сорил')),
      body: async.when(
        loading: () => const LoadingState(cards: 2),
        error: (e, _) => publicError(e, onRetry: () => ref.invalidate(mockExamsProvider)),
        data: (m) => RefreshIndicator(
          onRefresh: () {
            if (canRegister) ref.invalidate(myMockRegistrationsProvider);
            return ref.refresh(mockExamsProvider.future);
          },
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
              if (m.live != null) ...[const SectionHeader(title: 'Одоо явагдаж байна'), card(m.live!)],
              if (m.next != null && m.next!.id != m.live?.id) ...[
                const SectionHeader(title: 'Дараагийн сорил'),
                card(m.next!),
              ],
              if (m.upcoming.where((e) => e.id != m.next?.id && e.id != m.live?.id).isNotEmpty) ...[
                const SectionHeader(title: 'Удахгүй'),
                for (final e in m.upcoming.where((e) => e.id != m.next?.id && e.id != m.live?.id)) ...[
                  card(e),
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
              const SectionHeader(title: 'Хэрхэн явагддаг вэ'),
              for (final (i, (t, d)) in _steps.indexed)
                Padding(
                  padding: const EdgeInsets.only(bottom: AppSpace.sm),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(width: 28, child: Text('${i + 1}', style: context.text.titleSmall)),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [Text(t, style: context.text.titleSmall), Text(d, style: context.text.bodySmall)],
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

const _steps = [
  ('Бүртгүүл', 'Нэвтэрч ороод сорилд нэрээ бүртгүүл, нэг товч'),
  ('Цагтаа ор', 'Эхлэх цагт энэ хуудаснаас «Шалгалт эхлэх», хугацаа автоматаар явна'),
  ('Дүн, байраа хар', 'Илгээмэгц оноо, бусад сурагчдын дунд эзлэх байр гарна'),
];

/// Сорилын картын доод үйлдэл (вэбийн `EventCard`-ийн товчнууд).
class _EventAction extends StatelessWidget {
  const _EventAction({
    required this.event,
    required this.now,
    required this.reg,
    required this.canRegister,
    required this.loggedIn,
    required this.busy,
    required this.onAct,
  });

  final MockEvent event;
  final DateTime now;
  final MockRegistration? reg;
  final bool canRegister;
  final bool loggedIn;
  final bool busy;
  final ValueChanged<bool> onAct;

  @override
  Widget build(BuildContext context) {
    final r = reg;
    final live = !now.isBefore(event.startsAt) && !now.isAfter(event.endsAt);
    if (r != null && r.submitted) {
      final score = r.score != null && r.max != null ? ' ${formatMockScore(r.score!)}/${formatMockScore(r.max!)}' : '';
      return FilledButton.icon(
        icon: const Icon(AppIcons.ranking, size: 18),
        label: Text('Дүн, байр харах$score'),
        onPressed: () => context.push('/app/tests/${Uri.encodeComponent(r.testId)}/result'),
      );
    }
    if (r != null && live) {
      return FilledButton.icon(
        icon: const Icon(AppIcons.forward, size: 18),
        label: Text(r.status == 'IN_PROGRESS' ? 'Үргэлжлүүлэх' : 'Шалгалт эхлэх'),
        onPressed: () => context.push('/app/tests/${Uri.encodeComponent(r.testId)}'),
      );
    }
    if (r != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(AppIcons.success, size: 16, color: context.colors.success),
              const SizedBox(width: AppSpace.xs),
              Text('Бүртгүүлсэн', style: context.text.labelLarge?.copyWith(color: context.colors.success)),
            ],
          ),
          const SizedBox(height: AppSpace.xs),
          Text('Эхлэх цагт энд «Шалгалт эхлэх» товч гарна', style: context.text.bodySmall),
          if (now.isBefore(event.startsAt))
            TextButton(onPressed: busy ? null : () => onAct(false), child: const Text('Цуцлах')),
        ],
      );
    }
    if (canRegister) {
      return FilledButton.icon(
        icon: busy ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(AppIcons.check, size: 18),
        label: const Text('Бүртгүүлэх'),
        onPressed: busy || now.isAfter(event.endsAt) ? null : () => onAct(true),
      );
    }
    if (!loggedIn) {
      return Wrap(
        spacing: AppSpace.sm,
        runSpacing: AppSpace.xs,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          FilledButton(
            onPressed: () => context.push('/login?next=${Uri.encodeComponent('/sorils')}'),
            child: const Text('Нэвтэрч бүртгүүлэх'),
          ),
          TextButton(
            onPressed: () => context.push('/register?next=${Uri.encodeComponent('/sorils')}'),
            child: const Text('Шинэ хэрэглэгч үү? Бүртгүүлэх'),
          ),
        ],
      );
    }
    return Text('Сорилд сурагч, худалдан авагч эрхээр бүртгүүлнэ', style: context.text.bodySmall);
  }
}

/// 12.0 → «12», 12.5 → «12.5».
String formatMockScore(num v) => v == v.roundToDouble() ? v.round().toString() : v.toString();

/// «Ням, 10-р сарын 18, 11:00» (вэбийн `fmtUb`).
String formatEventTime(DateTime instant) {
  final t = UbDateTime.fromInstant(instant);
  return '${DateMn.longWithWeekday(t).split(', ').reversed.join(', ')}, ${DateMn.time(t)}';
}

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event, this.action});

  final MockEvent event;
  final Widget? action;

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
          if (action != null) ...[const SizedBox(height: AppSpace.md), action!],
        ],
      ),
    );
  }
}
