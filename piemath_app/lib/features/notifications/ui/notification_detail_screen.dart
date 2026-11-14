import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/config/env.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/notification_models.dart';
import '../domain/notification_link.dart';
import '../domain/notifications_controller.dart';

/// Мэдэгдлийн дэлгэрэнгүй (`/app/notifications/:id`) — холбоос нь апп-д тохирох хэсэггүй үед энд
/// нээгдэнэ (хөтөч, вэб рүү хөтлөхгүй). Жагсаалтаас `extra`-аар, эсвэл ачаалсан жагсаалтаас олно.
class NotificationDetailScreen extends ConsumerWidget {
  const NotificationDetailScreen({super.key, required this.id, this.initial});

  final String id;
  final AppNotification? initial;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final item = initial ?? ref.watch(notificationsControllerProvider).value?.items.where((n) => n.id == id).firstOrNull;
    final loading = item == null && ref.watch(notificationsControllerProvider).isLoading;
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Мэдэгдэл')),
      body: item != null
          ? _Body(item: item)
          : loading
              ? const LoadingState(cards: 1)
              : EmptyState(
                  icon: AppIcons.notifications,
                  title: 'Мэдэгдэл олдсонгүй',
                  message: 'Мэдэгдлийн жагсаалт руу буцаж дахин нээнэ үү',
                  action: OutlinedButton(
                    onPressed: () => context.go('/app/notifications'),
                    child: const Text('Мэдэгдлүүд'),
                  ),
                ),
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.item});

  final AppNotification item;

  @override
  Widget build(BuildContext context) {
    final created = parseApiInstant(item.createdAt);
    final target = notificationTarget(item.link, webHost: Uri.parse(Env.webBaseUrl).host);
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xxl),
      children: [
        Text(item.title, style: context.text.titleLarge),
        if (created != null) ...[
          const SizedBox(height: AppSpace.xs),
          Text(DateMn.long(UbDateTime.fromInstant(created)), style: context.text.bodySmall),
        ],
        if (item.body != null && item.body!.trim().isNotEmpty) ...[
          const SizedBox(height: AppSpace.lg),
          SelectableText(item.body!, style: context.text.bodyLarge),
        ],
        if (target != null) ...[
          const SizedBox(height: AppSpace.xl),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: FilledButton.icon(
              onPressed: () => context.push(target),
              icon: const Icon(AppIcons.arrowUpRight, size: 18),
              label: const Text('Холбогдох хэсэг рүү очих'),
            ),
          ),
        ],
      ],
    );
  }
}
