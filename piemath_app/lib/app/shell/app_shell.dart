import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/auth/user_role.dart';
import '../../core/ui/ui.dart';
import '../../features/notifications/domain/notifications_controller.dart';
import '../nav/nav_data.dart';
import 'app_nav_bar.dart';

/// «Бусад» цэсний зам.
const morePath = '/app/more';

/// Нэвтэрсэн хэрэглэгчийн бүрхүүл: утсанд доод таб, таблетад (768dp+) зүүн rail (RULES §5).
///
/// Таб бүр өөрийн navigator-тэй ([StatefulShellRoute] салбар) — солиход хуудас, гүйлгэлт, ачаалсан
/// өгөгдөл хэвээр үлдэнэ ([BranchStack]). Идэвхтэй табыг дахин товшвол: дээр нь нээгдсэн хуудас
/// байвал табын эхэнд буцна, үгүй бол жагсаалт дээш гүйлгэгдэнэ. Солих бүрт хөнгөн haptic.
/// Андройдын «буцах» табын эхэнд байхад нүүр таб руу (нүүрэнд байвал апп хаагдана).
class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.navigationShell, required this.sections});

  final StatefulNavigationShell navigationShell;

  /// Role-ийн хэсгүүд (салбар бүрт нэг); сүүлийн салбар нь «Бусад».
  final List<NavSection> sections;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  /// Салбар бүрт хэрэглэгчийн сүүлд гүйлгэсэн босоо жагсаалтууд (дахин товшиход дээш гүйлгэх).
  final Map<int, List<ScrollableState>> _scrolled = {};

  StatefulNavigationShell get _shell => widget.navigationShell;

  bool _onScroll(ScrollNotification n) {
    if (n.metrics.axis != Axis.vertical || n is! ScrollStartNotification) return false;
    final ctx = n.context;
    final state = ctx == null ? null : Scrollable.maybeOf(ctx);
    if (state == null) return false;
    final list = _scrolled.putIfAbsent(_shell.currentIndex, () => [])
      ..removeWhere((s) => !s.mounted || identical(s, state))
      ..add(state);
    if (list.length > 6) list.removeAt(0);
    return false;
  }

  void _onSelect(int i) {
    HapticFeedback.selectionClick();
    if (i != _shell.currentIndex) {
      _shell.goBranch(i);
      return;
    }
    // Идэвхтэй табыг дахин товшсон.
    final nav = _shell.route.branches[i].navigatorKey.currentState;
    if (nav != null && nav.canPop()) {
      final root = branchRootLocation(GoRouter.of(context).routerDelegate.currentConfiguration, _shell.route);
      if (root != null) {
        GoRouter.of(context).go(root);
        return;
      }
      nav.popUntil((r) => r.isFirst);
      return;
    }
    scrollToTop(_scrolled[i] ?? const [], reduced: AppMotion.reduced(context));
  }

  @override
  Widget build(BuildContext context) {
    final sections = widget.sections;
    final selected = _shell.currentIndex;
    final atHomeRoot = selected == 0;
    final body = NotificationListener<ScrollNotification>(onNotification: _onScroll, child: _shell);

    final wide = MediaQuery.sizeOf(context).width >= AppSizes.tabletBreakpoint;
    final Widget scaffold;
    if (wide) {
      scaffold = Scaffold(
        body: SafeArea(
          right: false,
          child: Row(
            children: [
              NavigationRail(
                selectedIndex: selected,
                onDestinationSelected: _onSelect,
                leading: const Padding(
                  padding: EdgeInsets.symmetric(vertical: AppSpace.md),
                  child: BrandLogo(size: 36),
                ),
                destinations: [
                  for (final s in sections)
                    NavigationRailDestination(icon: Icon(s.tab.icon), label: Text(s.tab.tabLabel)),
                  const NavigationRailDestination(icon: MoreTabIcon(), label: Text(moreLabel)),
                ],
              ),
              VerticalDivider(width: 1, color: context.colors.line),
              Expanded(child: body),
            ],
          ),
        ),
      );
    } else {
      scaffold = Scaffold(
        body: body,
        bottomNavigationBar: AppNavBar(
          currentIndex: selected,
          onTap: _onSelect,
          items: [
            for (final s in sections) AppNavItem(icon: Icon(s.tab.icon), label: s.tab.tabLabel, tooltip: s.tab.label),
            const AppNavItem(icon: MoreTabIcon(), label: moreLabel),
          ],
        ),
      );
    }
    // Табын эхэнд «буцах» → нүүр таб (Instagram, банкны апп-ын адил), нүүрэнд бол системд үлдээнэ.
    return PopScope(
      canPop: atHomeRoot,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && !atHomeRoot) _shell.goBranch(0);
      },
      child: scaffold,
    );
  }
}

/// «Бусад» табын шошго.
const moreLabel = 'Бусад';

/// Салбарын эхний (үндсэн) хуудасны зам — идэвхтэй табыг дахин товшиход тэнд буцна.
@visibleForTesting
String? branchRootLocation(RouteMatchList matches, StatefulShellRoute route) {
  String? walk(List<RouteMatchBase> list) {
    for (final m in list) {
      if (m is! ShellRouteMatch) continue;
      if (m.route == route) {
        final first = m.matches.isEmpty ? null : m.matches.first;
        return first is RouteMatch ? first.matchedLocation : null;
      }
      final inner = walk(m.matches);
      if (inner != null) return inner;
    }
    return null;
  }

  return walk(matches.matches);
}

/// Гүйлгэсэн жагсаалтуудыг эхэнд нь (хөдөлгөөн багасгах горимд шууд).
@visibleForTesting
void scrollToTop(Iterable<ScrollableState> scrollables, {bool reduced = false}) {
  for (final s in scrollables) {
    if (!s.mounted) continue;
    final p = s.position;
    if (!p.hasPixels || p.pixels <= p.minScrollExtent) continue;
    if (reduced) {
      p.jumpTo(p.minScrollExtent);
    } else {
      p.animateTo(p.minScrollExtent, duration: const Duration(milliseconds: 320), curve: AppEasing.decelerate);
    }
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
