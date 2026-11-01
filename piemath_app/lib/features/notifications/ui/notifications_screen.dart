import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/config/env.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/notification_models.dart';
import '../domain/notification_link.dart';
import '../domain/notifications_controller.dart';
import 'notifications_icons.dart';

/// Апп доторх мэдэгдэл (`/app/notifications`).
class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationsControllerProvider);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Мэдэгдэл'),
        actions: [
          IconButton(
            tooltip: 'Имэйлийн тохиргоо',
            icon: const Icon(NotificationsIcons.settings),
            onPressed: () => context.push('/app/notifications/settings'),
          ),
        ],
      ),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: e is ApiError ? e.message : AppStrings.genericError,
          onRetry: () => ref.invalidate(notificationsControllerProvider),
        ),
        data: (s) => RefreshIndicator(
          onRefresh: () => ref.refresh(notificationsControllerProvider.future).catchError((_) => s),
          child: _NotificationsList(state: s),
        ),
      ),
    );
  }
}

class _NotificationsList extends ConsumerWidget {
  const _NotificationsList({required this.state});

  final NotificationsState state;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = ref.read(notificationsControllerProvider.notifier);
    final visible = state.visible;
    final header = <Widget>[
      AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              alignment: WrapAlignment.spaceBetween,
              crossAxisAlignment: WrapCrossAlignment.center,
              spacing: AppSpace.sm,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(NotificationsIcons.bell, size: 18, color: context.colors.brand),
                    const SizedBox(width: AppSpace.sm),
                    Text('Уншаагүй', style: context.text.bodyMedium),
                    const SizedBox(width: AppSpace.sm),
                    Semantics(liveRegion: true, child: Text('${state.unread}', style: context.text.titleMedium)),
                  ],
                ),
                TextButton.icon(
                  onPressed: state.unread == 0 || state.busyAll ? null : c.markAllRead,
                  icon: const Icon(NotificationsIcons.markAll, size: 18),
                  label: const Text('Бүгдийг уншсан болгох'),
                ),
              ],
            ),
            const SizedBox(height: AppSpace.sm),
            SegmentedButton<NotificationFilter>(
              showSelectedIcon: false,
              segments: const [
                ButtonSegment(value: NotificationFilter.all, label: Text('Бүгд')),
                ButtonSegment(value: NotificationFilter.unread, label: Text('Уншаагүй')),
                ButtonSegment(value: NotificationFilter.read, label: Text('Уншсан')),
              ],
              selected: {state.filter},
              onSelectionChanged: (v) => c.setFilter(v.first),
            ),
          ],
        ),
      ),
      if (state.actionError != null)
        Padding(
          padding: const EdgeInsets.only(top: AppSpace.md),
          child: Row(
            children: [
              Icon(AppIcons.error, size: 18, color: context.colors.error),
              const SizedBox(width: AppSpace.sm),
              Expanded(child: Text(state.actionError!, style: context.text.bodySmall)),
            ],
          ),
        ),
      const SizedBox(height: AppSpace.md),
    ];

    final empty = visible.isEmpty;
    final count = header.length + (empty ? 1 : visible.length) + (state.nextCursor != null ? 1 : 0);
    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
      itemCount: count,
      itemBuilder: (context, index) {
        if (index < header.length) return header[index];
        final i = index - header.length;
        if (empty && i == 0) {
          return SizedBox(
            height: 280,
            child: EmptyState(
              icon: NotificationsIcons.bell,
              title: switch (state.filter) {
                NotificationFilter.unread => 'Уншаагүй мэдэгдэл алга',
                NotificationFilter.read => 'Уншсан мэдэгдэл алга',
                NotificationFilter.all => 'Мэдэгдэл алга',
              },
              message: state.nextCursor != null
                  ? 'Дараагийн хуудсанд үргэлжлүүлэн шалгаж болно.'
                  : 'Шинэ даалгавар эсвэл зар ирэхэд энд харагдана.',
            ),
          );
        }
        final itemIndex = empty ? i - 1 : i;
        if (itemIndex >= visible.length) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: AppSpace.md),
            child: Center(
              child: OutlinedButton.icon(
                onPressed: state.loadingMore ? null : c.loadMore,
                icon: state.loadingMore
                    ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(NotificationsIcons.more, size: 18),
                label: const Text('Дараагийн мэдэгдлүүд'),
              ),
            ),
          );
        }
        final n = visible[itemIndex];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpace.md),
          child: NotificationTile(
            item: n,
            busy: state.busyId == n.id,
            disabled: state.busyId != null || state.busyAll,
            onMarkRead: () => c.markRead(n.id),
            now: ref.read(notificationsNowProvider)(),
          ),
        );
      },
    );
  }
}

/// Нэг мэдэгдэл. Уншаагүй бол зүүн хөх зурвас + «Шинэ» шошго (өнгө дангаараа биш).
class NotificationTile extends StatelessWidget {
  const NotificationTile({
    super.key,
    required this.item,
    required this.onMarkRead,
    this.busy = false,
    this.disabled = false,
    this.now,
  });

  final AppNotification item;
  final VoidCallback onMarkRead;
  final bool busy;
  final bool disabled;

  /// «5 минутын өмнө»-ийн суурь цаг (өгөөгүй бол одоо).
  final DateTime? now;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final unread = item.readAt == null;
    final target = notificationTarget(item.link, webHost: Uri.parse(Env.webBaseUrl).host);
    final created = parseApiInstant(item.createdAt);
    return AppCard(
      accent: unread ? c.brand : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 2),
                child: Icon(NotificationsIcons.forKind(item.kind), size: 20, color: unread ? c.brand : c.inkDim),
              ),
              const SizedBox(width: AppSpace.md),
              Expanded(child: Text(item.title, style: context.text.titleSmall)),
              const SizedBox(width: AppSpace.sm),
              _StateChip(unread: unread),
            ],
          ),
          if (item.body != null && item.body!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Text(item.body!, style: context.text.bodyMedium?.copyWith(color: c.inkDim)),
          ],
          if (created != null) ...[
            const SizedBox(height: AppSpace.sm),
            Text(DateMn.relative(created, now: now), style: context.text.bodySmall),
          ],
          if (target != null || unread)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.sm),
              child: Wrap(
                spacing: AppSpace.sm,
                runSpacing: AppSpace.xs,
                children: [
                  if (target != null)
                    TextButton.icon(
                      onPressed: () {
                        if (unread && !disabled) onMarkRead();
                        context.push(target);
                      },
                      icon: const Icon(NotificationsIcons.go, size: 18),
                      label: const Text('Холбогдох хэсэг рүү очих'),
                    ),
                  if (unread)
                    OutlinedButton(
                      onPressed: disabled ? null : onMarkRead,
                      child: busy
                          ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Уншсан болгох'),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

class _StateChip extends StatelessWidget {
  const _StateChip({required this.unread});

  final bool unread;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: 2),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(AppRadius.pill),
        border: Border.all(color: unread ? c.brand : c.line),
      ),
      child: Text(
        unread ? 'Шинэ' : 'Уншсан',
        style: context.text.labelSmall?.copyWith(color: unread ? c.brand : c.inkDim),
      ),
    );
  }
}
