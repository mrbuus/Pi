import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/time/weekday.dart';
import '../../../core/ui/ui.dart';
import '../../books/data/books_models.dart' show MockEvent, MockPublic;
import '../../books/data/books_repository.dart' show mockExamsProvider;
import '../data/mock_exams.dart';

/// «Жишиг сорил» таб (вэбийн `mock-exams/MockExamsPanel`): ойрын/явагдаж буй сорил том картаар,
/// дараагийн долоо хоногууд; апп дотроос бүртгүүлэх, цуцлах, цагт нь «Шалгалт эхлэх», дууссаны дараа дүн.
class MockExamsTab extends ConsumerStatefulWidget {
  const MockExamsTab({super.key, this.now});

  /// Тестэд тогтмол цаг.
  final DateTime? now;

  @override
  ConsumerState<MockExamsTab> createState() => _MockExamsTabState();
}

class _MockExamsTabState extends ConsumerState<MockExamsTab> {
  Timer? _tick;
  String? _busy;

  DateTime get _now => widget.now ?? DateTime.now();

  @override
  void initState() {
    super.initState();
    // «Эхлэхэд N үлдлээ» шинэчлэгдэнэ
    if (widget.now == null) _tick = Timer.periodic(const Duration(seconds: 30), (_) => setState(() {}));
  }

  @override
  void dispose() {
    _tick?.cancel();
    super.dispose();
  }

  Future<void> _act(MockEvent ev, {required bool on}) async {
    setState(() => _busy = ev.id);
    final messenger = ScaffoldMessenger.maybeOf(context);
    try {
      await registerMockExam(ref, ev.id, on: on);
      messenger?.showSnackBar(
        SnackBar(content: Text(on ? 'Бүртгүүллээ, цагтаа эндээс эхлүүлээрэй' : 'Бүртгэлийг цуцаллаа')),
      );
      ref
        ..invalidate(myMockRegistrationsProvider)
        ..invalidate(mockExamsProvider);
    } on ApiError catch (e) {
      messenger?.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final pub = ref.watch(mockExamsProvider);
    final regs = {for (final r in ref.watch(myMockRegistrationsProvider).value ?? const <MockRegistration>[]) r.eventId: r};
    return pub.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(),
      error: (e, _) => ErrorState(
        message: 'Сорилын мэдээллийг ачаалж чадсангүй',
        onRetry: () => ref.invalidate(mockExamsProvider),
      ),
      data: (p) => RefreshIndicator(
        onRefresh: () async {
          ref
            ..invalidate(mockExamsProvider)
            ..invalidate(myMockRegistrationsProvider);
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xxl),
          children: _children(context, p, regs),
        ),
      ),
    );
  }

  List<Widget> _children(BuildContext context, MockPublic p, Map<String, MockRegistration> regs) {
    final main = p.live ?? p.next;
    final rest = [for (final e in p.upcoming) if (e.id != main?.id) e];
    Widget card(MockEvent ev, {bool big = false}) => Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.md),
          child: MockEventCard(
            event: ev,
            now: _now,
            registration: regs[ev.id],
            busy: _busy == ev.id,
            big: big,
            onAct: (on) => _act(ev, on: on),
          ),
        );
    return [
      if (main != null)
        card(main, big: true)
      else
        const EmptyState(icon: AppIcons.calendar, title: 'Дараагийн сорилын хуваарь удахгүй зарлагдана'),
      if (rest.isNotEmpty) ...[
        const SectionHeader(title: 'Дараагийн долоо хоногууд', padding: EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.sm)),
        for (final e in rest) card(e),
      ],
    ];
  }
}

/// Нэг сорилын карт (вэбийн `EventCard`).
class MockEventCard extends StatelessWidget {
  const MockEventCard({
    super.key,
    required this.event,
    required this.now,
    required this.registration,
    required this.busy,
    required this.onAct,
    this.big = false,
  });

  final MockEvent event;
  final DateTime now;
  final MockRegistration? registration;
  final bool busy;
  final bool big;
  final ValueChanged<bool> onAct;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ev = event;
    final reg = registration;
    final live = !now.isBefore(ev.startsAt) && !now.isAfter(ev.endsAt);
    final left = mockTimeLeft(ev.startsAt.difference(now));
    final status = live ? 'Явагдаж байна' : (left == 'одоо' ? 'Эхэлж байна' : 'Эхлэхэд $left үлдлээ');
    final start = UbDateTime.fromInstant(ev.startsAt);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(status, style: context.text.labelMedium?.copyWith(color: c.brand)),
                    Text(ev.title, style: big ? context.text.titleLarge : context.text.titleMedium),
                    Text(
                      '${weekdayNameMn(start.weekday)}, ${DateMn.long(start)}, ${DateMn.time(start)}',
                      style: context.text.bodySmall,
                    ),
                  ],
                ),
              ),
              if (reg != null)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(AppIcons.success, size: 16, color: c.success),
                    const SizedBox(width: 4),
                    Text('Бүртгүүлсэн', style: context.text.labelMedium?.copyWith(color: c.success)),
                  ],
                ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Meta(
            items: [
              '${ev.problemCount} бодлого',
              if (ev.timeLimitMin != null && ev.timeLimitMin! > 0) '${ev.timeLimitMin} минут',
              '${ev.registered} бүртгүүлсэн',
            ],
          ),
          if (ev.note != null && ev.note!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.xs),
            Text(ev.note!, style: context.text.bodySmall),
          ],
          const SizedBox(height: AppSpace.md),
          _actions(context, live),
        ],
      ),
    );
  }

  Widget _actions(BuildContext context, bool live) {
    final reg = registration;
    if (reg != null && reg.status == MockRegStatus.submitted) {
      final score = reg.score != null && reg.max != null ? ' ${_fmt(reg.score!)}/${_fmt(reg.max!)}' : '';
      return FilledButton.icon(
        onPressed: () => context.push('/app/tests/${Uri.encodeComponent(reg.testId)}'),
        icon: const Icon(AppIcons.ranking, size: 18),
        label: Text('Дүн, байр харах$score'),
      );
    }
    if (reg != null && live) {
      return FilledButton.icon(
        onPressed: () => context.push('/app/tests/${Uri.encodeComponent(reg.testId)}'),
        icon: const Icon(AppIcons.forward, size: 18),
        label: Text(reg.status == MockRegStatus.inProgress ? 'Үргэлжлүүлэх' : 'Шалгалт эхлэх'),
      );
    }
    if (reg != null) {
      return Wrap(
        crossAxisAlignment: WrapCrossAlignment.center,
        spacing: AppSpace.sm,
        children: [
          Text('Эхлэх цагт энд «Шалгалт эхлэх» товч гарна', style: context.text.bodySmall),
          if (now.isBefore(event.startsAt))
            TextButton.icon(
              onPressed: busy ? null : () => onAct(false),
              icon: const Icon(AppIcons.close, size: 18),
              label: const Text('Цуцлах'),
            ),
        ],
      );
    }
    return FilledButton.icon(
      onPressed: busy || now.isAfter(event.endsAt) ? null : () => onAct(true),
      icon: busy
          ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
          : const Icon(AppIcons.success, size: 18),
      label: const Text('Бүртгүүлэх'),
    );
  }

  static String _fmt(num v) => v == v.roundToDouble() ? v.toInt().toString() : v.toStringAsFixed(1);
}
