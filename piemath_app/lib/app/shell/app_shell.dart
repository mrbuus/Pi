import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/auth/user_role.dart';
import '../../core/ui/ui.dart';
import '../../features/notifications/domain/notifications_controller.dart';
import '../nav/nav_data.dart';

/// «Бусад» цэсний зам.
const morePath = '/app/more';

/// Нэвтэрсэн хэрэглэгчийн бүрхүүл: утсанд доод таб, таблетад (768dp+) зүүн rail (RULES §5).
/// Цэс role-оор (вэбийн `BottomTabs` + `Sidebar`).
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.location, required this.child});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final role = session is SignedIn ? NavData.navigationRole(session.role, session.user) : UserRole.unknown;
    final tabs = NavData.tabs(role);
    final active = NavData.activeTab(tabs, location);
    // Табд ороогүй хуудас (мэдэгдэл, профайл …) → «Бусад» идэвхтэй.
    final selected = active >= 0 ? active : tabs.length;

    void onSelect(int i) {
      final path = i < tabs.length ? tabs[i].path : morePath;
      if (path != location) context.go(path);
    }

    final wide = MediaQuery.sizeOf(context).width >= AppSizes.tabletBreakpoint;
    if (wide) {
      return Scaffold(
        body: SafeArea(
          right: false,
          child: Row(
            children: [
              NavigationRail(
                selectedIndex: selected,
                onDestinationSelected: onSelect,
                leading: const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpace.md),
                  child: BrandLogo(size: 36),
                ),
                destinations: [
                  for (final t in tabs)
                    NavigationRailDestination(icon: Icon(t.icon), label: Text(t.tabLabel)),
                  const NavigationRailDestination(icon: MoreTabIcon(), label: Text('Бусад')),
                ],
              ),
              VerticalDivider(width: 1, color: context.colors.line),
              Expanded(child: child),
            ],
          ),
        ),
      );
    }
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selected,
        onDestinationSelected: onSelect,
        destinations: [
          for (final t in tabs) NavigationDestination(icon: Icon(t.icon), label: t.tabLabel, tooltip: t.label),
          const NavigationDestination(icon: MoreTabIcon(), label: 'Бусад'),
        ],
      ),
    );
  }
}

/// «Бусад» таб — уншаагүй мэдэгдэл байвал тоотой тэмдэг (мэдэгдэл «Бусад» дотор байдаг).
class MoreTabIcon extends ConsumerWidget {
  const MoreTabIcon({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadNotificationsCountProvider).value ?? 0;
    return Semantics(
      label: unread > 0 ? 'Уншаагүй мэдэгдэл $unread' : null,
      child: Badge(
        isLabelVisible: unread > 0,
        backgroundColor: context.colors.error,
        textColor: context.colors.onStatus,
        label: Text(unread > 99 ? '99+' : '$unread'),
        child: const Icon(AppIcons.more),
      ),
    );
  }
}

/// «Буцах» = ӨМНӨХ дэлгэц. Гаднаас (QR, push) нээгдсэн, өмнөх дэлгэцгүй бол нүүр (RULES §5).
class AppBackButton extends ConsumerWidget {
  const AppBackButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return IconButton(
      icon: const Icon(AppIcons.back),
      tooltip: AppStrings.back,
      onPressed: () {
        if (context.canPop()) {
          context.pop();
          return;
        }
        final s = ref.read(sessionProvider);
        final role = s is SignedIn ? NavData.navigationRole(s.role, s.user) : UserRole.unknown;
        context.go(s is SignedIn ? NavData.home(role).path : '/login');
      },
    );
  }
}
