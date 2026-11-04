import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/auth/current_user.dart';
import '../../../core/auth/session.dart';
import '../../../core/files/file_image.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/ui/ui.dart';
import '../../push/push_service.dart';
import 'avatar_change_button.dart';
import 'change_password_form.dart';
import 'linked_accounts_card.dart';

/// «Миний мэдээлэл» — хувийн мэдээлэл, код, нууц үг солих нэг дор (вэбийн `/app/profile`).
///
/// Нэр, утас, имэйлийг ЗАСАХ endpoint API-д байхгүй — зөвхөн харуулна. Google/Apple холбох,
/// бүртгэл устгах хүсэлт (M6) энд. Профайл зураг: `AvatarChangeButton` (`/uploads` → `/auth/me/avatar`).
class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _refreshing = false;

  @override
  void initState() {
    super.initState();
    final s = ref.read(sessionProvider);
    if (s is SignedIn && s.user == null) WidgetsBinding.instance.addPostFrameCallback((_) => _refresh());
  }

  Future<void> _refresh() async {
    if (_refreshing) return;
    setState(() => _refreshing = true);
    try {
      await ref.read(sessionProvider.notifier).refreshUser();
    } catch (_) {
      // Алдааг доорх төлөв (user == null) харуулна.
    } finally {
      if (mounted) setState(() => _refreshing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionProvider);
    final user = session is SignedIn ? session.user : null;
    final online = ref.watch(reachabilityProvider);

    Widget body;
    if (user != null) {
      body = _ProfileBody(user: user);
    } else if (_refreshing || online) {
      body = const LoadingState(cards: 2);
    } else {
      body = ErrorState(message: AppStrings.networkError, onRetry: _refresh);
    }

    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Миний мэдээлэл')),
      body: body,
    );
  }
}

class _ProfileBody extends ConsumerWidget {
  const _ProfileBody({required this.user});

  final CurrentUser user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final code = user.teacherCode ?? user.studentCode;
    final codeLabel = user.teacherCode != null ? 'Багшийн код' : 'Сурагчийн код';
    final fullName = [user.lastName, user.firstName].whereType<String>().where((s) => s.trim().isNotEmpty).join(' ');

    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: AppSizes.readableWidth),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                AppCard(
                  child: Row(
                    children: [
                      _Avatar(user: user),
                      const SizedBox(width: AppSpace.lg),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(user.displayName, style: context.text.titleLarge),
                            const SizedBox(height: AppSpace.xs),
                            Text(user.role.labelMn, style: context.text.bodySmall),
                            AvatarChangeButton(hasAvatar: (user.avatarUrl ?? '').isNotEmpty),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (code != null && code.isNotEmpty) ...[
                  const SizedBox(height: AppSpace.md),
                  _CodeRow(code: code, label: codeLabel),
                ],
                const SectionHeader(title: 'Хувийн мэдээлэл'),
                AppCard(
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
                  child: Column(
                    children: [
                      _FieldRow(icon: AppIcons.user, label: 'Нэр', value: fullName, placeholder: 'Нэр байхгүй'),
                      Divider(color: context.colors.line),
                      _FieldRow(
                        icon: AppIcons.phone,
                        label: 'Утас',
                        value: user.phone,
                        placeholder: 'Утасны дугаар холбогдоогүй',
                      ),
                      Divider(color: context.colors.line),
                      _FieldRow(
                        icon: AppIcons.mail,
                        label: 'Имэйл',
                        value: user.email,
                        placeholder: 'Имэйл холбогдоогүй',
                      ),
                    ],
                  ),
                ),
                const SectionHeader(title: 'Нууц үг солих'),
                const AppCard(child: ChangePasswordForm()),
                const LinkedAccountsSection(),
                const SizedBox(height: AppSpace.xl),
                OutlinedButton.icon(
                  icon: Icon(AppIcons.logout, color: context.colors.error),
                  label: Text('Гарах', style: TextStyle(color: context.colors.error)),
                  onPressed: () => _confirmLogout(context, ref),
                ),
                const SizedBox(height: AppSpace.md),
                Center(
                  child: TextButton(
                    style: TextButton.styleFrom(minimumSize: const Size(0, AppSizes.minTap)),
                    onPressed: () => context.push(deletionRequestPath),
                    child: Text('Бүртгэл устгах хүсэлт', style: TextStyle(color: context.colors.inkDim)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
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
    if (!(ok ?? false)) return;
    // Нэвтрэх токен хүчинтэй байхад серверээс push токеныг устгана (гарсны дараа 401 болно).
    await ref.read(pushServiceProvider).unregisterPush();
    await ref.read(sessionProvider.notifier).signOut();
  }
}

/// Профайл зураг (`avatarUrl` нь ФАЙЛЫН KEY) эсвэл нэрийн эхний үсэг.
class _Avatar extends ConsumerWidget {
  const _Avatar({required this.user});

  final CurrentUser user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = user.avatarUrl;
    const size = 56.0;
    final initial = user.firstName.trim().isEmpty ? '' : user.firstName.trim().substring(0, 1).toUpperCase();
    final fallback = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(color: context.colors.brandTint, shape: BoxShape.circle),
      child: initial.isEmpty
          ? Icon(AppIcons.user, color: context.colors.brand)
          : Text(initial, style: context.text.titleLarge?.copyWith(color: context.colors.brand)),
    );
    if (key == null || key.isEmpty) return ExcludeSemantics(child: fallback);
    final px = (size * MediaQuery.devicePixelRatioOf(context)).round();
    return Semantics(
      image: true,
      label: 'Профайл зураг',
      child: ClipOval(
        child: Image(
          image: ResizeImage(ref.watch(fileImageProvider).image(key), width: px),
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => fallback,
          loadingBuilder: (_, child, progress) => progress == null ? child : fallback,
        ),
      ),
    );
  }
}

class _CodeRow extends StatelessWidget {
  const _CodeRow({required this.code, required this.label});

  final String code;
  final String label;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: context.text.bodySmall),
                SelectableText(code, style: context.text.titleMedium),
              ],
            ),
          ),
          OutlinedButton.icon(
            icon: const Icon(AppIcons.copy, size: 16),
            label: const Text('Хуулах'),
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: code));
              if (!context.mounted) return;
              ScaffoldMessenger.of(context)
                ..hideCurrentSnackBar()
                ..showSnackBar(SnackBar(content: Text('$label хуулагдлаа')));
            },
          ),
        ],
      ),
    );
  }
}

class _FieldRow extends StatelessWidget {
  const _FieldRow({required this.icon, required this.label, required this.value, required this.placeholder});

  final IconData icon;
  final String label;
  final String? value;
  final String placeholder;

  @override
  Widget build(BuildContext context) {
    final v = value;
    final has = v != null && v.trim().isNotEmpty;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 56),
      child: Row(
        children: [
          Icon(icon, size: 20, color: context.colors.inkDim),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(label, style: context.text.bodySmall),
                if (has)
                  SelectableText(v, style: context.text.bodyLarge)
                else
                  Text(placeholder, style: context.text.bodyLarge?.copyWith(color: context.colors.inkDim)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Бүртгэл устгах хүсэлтийн зам (`auth_routes.dart`).
const deletionRequestPath = '/app/profile/deletion-request';

/// `/app/password` — хуучин холбоосонд (вэб нь профайл руу шилжүүлдэг). Апп-д ганцаар нь харуулна.
class ChangePasswordScreen extends StatelessWidget {
  const ChangePasswordScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Нууц үг солих')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: [
          Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: const AppCard(child: ChangePasswordForm()),
            ),
          ),
        ],
      ),
    );
  }
}
