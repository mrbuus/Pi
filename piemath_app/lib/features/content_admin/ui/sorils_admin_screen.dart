import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/content_providers.dart';
import '../data/content_models.dart';
import 'content_widgets.dart';

/// Жишиг сорил (`/app/admin/sorils`, вэбийн `MockExamsAdminClient`) — 7 хоног бүрийн онлайн сорил:
/// хуваарь, бүртгэл, дүн. Нэмэх, нийтлэх нь Админ, Багш+. Сорил устгах апп-д байхгүй — сервер бүр мөсөн
/// устгадаг тул нийтлэлийг нь хаана (прод өгөгдлийн дүрэм).
class SorilsAdminScreen extends ConsumerStatefulWidget {
  const SorilsAdminScreen({super.key});

  static const path = '/app/admin/sorils';

  @override
  ConsumerState<SorilsAdminScreen> createState() => _SorilsAdminScreenState();
}

class _SorilsAdminScreenState extends ConsumerState<SorilsAdminScreen> {
  final _busy = <String>{};

  /// Дараагийн Ням 11:00 (UB) — вэбийн `nextSundayLocal`.
  UbDateTime _nextSunday() {
    final now = ref.read(contentNowProvider);
    final add = (7 - now.weekday % 7) % 7;
    return now.startOfDay.addDays(add == 0 ? 7 : add);
  }

  Future<void> _create() async {
    final repo = ref.read(contentRepositoryProvider);
    List<MockTestOption> tests;
    try {
      tests = await repo.mockTests();
    } catch (e) {
      if (mounted) contentSnack(context, contentError(e, 'Тестийн жагсаалтыг ачаалж чадсангүй'));
      return;
    }
    if (!mounted) return;
    if (tests.isEmpty) {
      contentSnack(context, 'Тохирох тест алга (автомат дүнтэй, хугацаатай тест хэрэгтэй)');
      return;
    }
    final day = _nextSunday();
    final ok = await showFormSheet<bool>(
      context,
      title: 'Шинэ сорил',
      submitLabel: 'Нэмэх',
      fields: [
        const FormTextField(
          name: 'title',
          label: 'Нэр',
          initial: 'Долоо хоногийн жишиг сорил',
          required: true,
          maxLength: 120,
        ),
        FormSelectField<String>(
          name: 'test',
          label: 'Тест',
          required: true,
          options: [
            for (final t in tests)
              SelectOption(t.id, t.title, subtitle: '${t.problemCount} бодлого, ${t.timeLimitMin ?? '-'} мин'),
          ],
        ),
        FormDateField(name: 'day', label: 'Эхлэх өдөр', initial: day, required: true),
        const FormTimeField(name: 'time', label: 'Эхлэх цаг', initial: TimeOfDay(hour: 11, minute: 0), required: true),
        const FormNumberField(
          name: 'late',
          label: 'Хоцорч эхлүүлж болох',
          initial: 30,
          min: 0,
          max: 600,
          suffixText: 'мин',
        ),
        const FormTextField(name: 'note', label: 'Тайлбар (заавал биш)', maxLength: 500),
      ],
      onSubmit: (v) async {
        final d = v.date('day')!;
        final t = v.time('time')!;
        await repo.createMock(
          title: v.text('title'),
          testId: v.get<String>('test')!,
          startsAt: UbDateTime(d.year, d.month, d.day, t.hour, t.minute).toInstant(),
          lateMin: v.integer('late'),
          note: v.text('note'),
        );
        return true;
      },
    );
    if (ok == true && mounted) {
      contentSnack(context, 'Сорил нэмэгдлээ');
      ref.invalidate(mockEventsProvider);
    }
  }

  Future<void> _togglePublish(MockEvent e) async {
    if (_busy.contains(e.id)) return;
    setState(() => _busy.add(e.id));
    try {
      await ref.read(contentRepositoryProvider).setMockPublished(e.id, !e.published);
      if (mounted) {
        contentSnack(context, e.published ? 'Нийтлэлийг хаалаа' : 'Нийтэллээ');
        ref.invalidate(mockEventsProvider);
      }
    } catch (err) {
      if (mounted) contentSnack(context, contentError(err));
    } finally {
      if (mounted) setState(() => _busy.remove(e.id));
    }
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(contentAccessProvider);
    final async = access.canOpen ? ref.watch(mockEventsProvider) : null;
    return Scaffold(
      appBar: AppBar(title: const Text('Жишиг сорил')),
      floatingActionButton: access.canEditMocks
          ? FloatingActionButton.extended(
              onPressed: _create,
              icon: const Icon(AppIcons.add),
              label: const Text('Шинэ сорил'),
            )
          : null,
      body: async == null
          ? const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden)
          : AsyncBody<List<MockEvent>>(
              value: async,
              onRetry: () => ref.invalidate(mockEventsProvider),
              data: (events) => events.isEmpty
                  ? const EmptyState(
                      icon: AppIcons.tests,
                      title: 'Сорил хараахан алга',
                      message: '«Шинэ сорил» дарж тест, өдөр, цагаа сонгоход нийтийн хуудсанд гарна',
                    )
                  : RefreshIndicator(
                      onRefresh: () async => ref.invalidate(mockEventsProvider),
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 96),
                        itemCount: events.length,
                        separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                        itemBuilder: (context, i) => _EventCard(
                          event: events[i],
                          canEdit: access.canEditMocks,
                          busy: _busy.contains(events[i].id),
                          onToggle: () => _togglePublish(events[i]),
                          onOpen: () => showRegistrations(context, events[i]),
                        ),
                      ),
                    ),
            ),
    );
  }
}

class _EventCard extends StatelessWidget {
  const _EventCard({
    required this.event,
    required this.canEdit,
    required this.busy,
    required this.onToggle,
    required this.onOpen,
  });

  final MockEvent event;
  final bool canEdit;
  final bool busy;
  final VoidCallback onToggle;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final e = event;
    final start = e.startsAt == null ? null : UbDateTime.fromInstant(e.startsAt!);
    return AppCard(
      onTap: onOpen,
      padding: const EdgeInsets.fromLTRB(AppSpace.lg, AppSpace.md, AppSpace.xs, AppSpace.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(e.title, style: context.text.titleSmall),
                const SizedBox(height: 2),
                Meta(
                  items: [
                    if (start != null) DateMn.numericWithTime(start),
                    e.testTitle,
                    '${e.problemCount} бодлого, ${e.timeLimitMin ?? '-'} мин',
                  ],
                ),
                const SizedBox(height: AppSpace.sm),
                Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.xs,
                  children: [
                    MetaChip(
                      label: e.phase.label,
                      tone: switch (e.phase) {
                        MockPhase.live => ChipTone.success,
                        MockPhase.upcoming => ChipTone.info,
                        MockPhase.done => ChipTone.neutral,
                      },
                    ),
                    if (!e.published) const MetaChip(label: 'Нийтлээгүй', tone: ChipTone.warning, icon: AppIcons.hide),
                    MetaChip(label: '${e.registered} бүртгэл', icon: AppIcons.students, tone: ChipTone.brand),
                    MetaChip(label: '${e.results} дүн', tone: e.results > 0 ? ChipTone.success : ChipTone.neutral),
                  ],
                ),
              ],
            ),
          ),
          if (canEdit)
            IconButton(
              tooltip: e.published ? 'Нийтлэлийг хаах' : 'Нийтлэх',
              icon: Icon(e.published ? AppIcons.hide : AppIcons.show),
              onPressed: busy ? null : onToggle,
            ),
        ],
      ),
    );
  }
}

/// Сорилын бүртгэл, дүн — доороос гарах жагсаалт (утсанд хүснэгтгүй).
Future<void> showRegistrations(BuildContext context, MockEvent e) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (context) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.7,
    maxChildSize: 0.95,
    builder: (context, scroll) => _Registrations(event: e, scroll: scroll),
  ),
);

class _Registrations extends ConsumerWidget {
  const _Registrations({required this.event, required this.scroll});

  final MockEvent event;
  final ScrollController scroll;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(mockRegistrationsProvider(event.id));
    return CustomScrollView(
      controller: scroll,
      slivers: [
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.sm),
          sliver: SliverToBoxAdapter(child: Text('${event.title}, бүртгэл', style: context.text.titleMedium)),
        ),
        switch (async) {
          AsyncData(:final value) when value.isEmpty => const SliverFillRemaining(
            hasScrollBody: false,
            child: EmptyState(icon: AppIcons.students, title: 'Бүртгүүлсэн хүн алга'),
          ),
          AsyncData(:final value) => SliverList.builder(
            itemCount: value.length,
            itemBuilder: (context, i) {
              final r = value[i];
              return ListTile(
                minTileHeight: AppSizes.minTap,
                title: Text(r.displayName),
                subtitle: Meta(
                  items: [r.studentCode, r.school, if (r.grade != null) '${r.grade}-р анги', r.status.label],
                ),
                trailing: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (r.score != null)
                      Text('${fmtNum(r.score!)}/${fmtNum(r.max ?? 0)}', style: context.text.titleSmall),
                    if (r.phone != null && r.phone!.isNotEmpty)
                      IconButton(
                        tooltip: 'Залгах',
                        icon: const Icon(AppIcons.phone, size: 20),
                        onPressed: () => launchUrl(Uri(scheme: 'tel', path: r.phone)),
                      ),
                  ],
                ),
              );
            },
          ),
          AsyncError() => SliverFillRemaining(
            hasScrollBody: false,
            child: ErrorState(onRetry: () => ref.invalidate(mockRegistrationsProvider(event.id))),
          ),
          _ => const SliverToBoxAdapter(child: LoadingState(cards: 3)),
        },
        const SliverToBoxAdapter(child: SizedBox(height: AppSpace.xl)),
      ],
    );
  }
}
