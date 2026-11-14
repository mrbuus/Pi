import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/session.dart';
import '../../core/auth/user_role.dart';
import '../../core/ui/ui.dart';
import '../nav/nav_data.dart';
import '../theme_mode.dart';

/// «Бусад» — доод табд ороогүй БҮХ цэс бүлгээрээ, өнгөний горим, гарах.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final signedIn = session is SignedIn ? session : null;
    final role = signedIn == null ? UserRole.unknown : NavData.navigationRole(signedIn.role, signedIn.user);
    final groups = NavData.moreGroups(role);

    return Scaffold(
      appBar: AppBar(title: const Text('Бусад')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
        children: [
          if (signedIn != null)
            AppCard(
              onTap: () => context.push(NavData.profile.path),
              child: Row(
                children: [
                  Icon(AppIcons.profile, size: 36, color: context.colors.brand),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(signedIn.user?.displayName ?? role.labelMn, style: context.text.titleMedium),
                        Text(role.labelMn, style: context.text.bodySmall),
                      ],
                    ),
                  ),
                  Icon(AppIcons.forward, color: context.colors.inkDim),
                ],
              ),
            ),
          for (final (group, links) in groups) ...[
            SectionHeader(title: group.label),
            AppCard(
              padding: EdgeInsets.zero,
              child: Column(
                children: [
                  for (var i = 0; i < links.length; i++) ...[
                    if (i > 0) Divider(indent: 56, color: context.colors.line),
                    ListTile(
                      leading: Icon(links[i].icon),
                      title: Text(links[i].label),
                      trailing: Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
                      onTap: () => context.push(links[i].path),
                    ),
                  ],
                ],
              ),
            ),
          ],
          const SectionHeader(title: 'Өнгөний горим'),
          const _ThemePicker(),
          const SizedBox(height: AppSpace.xl),
          OutlinedButton.icon(
            icon: Icon(AppIcons.logout, color: context.colors.error),
            label: Text('Гарах', style: TextStyle(color: context.colors.error)),
            onPressed: () => _confirmLogout(context, ref),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmLogout(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Аппаас гарах уу?'),
        content: const Text('Дахин орохдоо утасны дугаар, нууц үгээ оруулна.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text(AppStrings.cancel)),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Гарах')),
        ],
      ),
    );
    if (ok ?? false) await ref.read(sessionProvider.notifier).signOut();
  }
}

class _ThemePicker extends ConsumerWidget {
  const _ThemePicker();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    return SegmentedButton<ThemeMode>(
      showSelectedIcon: false,
      segments: const [
        ButtonSegment(value: ThemeMode.system, icon: Icon(AppIcons.system, size: 18), label: Text('Утасны')),
        ButtonSegment(value: ThemeMode.light, icon: Icon(AppIcons.light, size: 18), label: Text('Цагаан')),
        ButtonSegment(value: ThemeMode.dark, icon: Icon(AppIcons.dark, size: 18), label: Text('Хар')),
      ],
      selected: {mode},
      onSelectionChanged: (s) => ref.read(themeModeProvider.notifier).set(s.first),
    );
  }
}
