import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/notification_models.dart';
import '../data/notifications_repository.dart';

final notificationSettingsProvider = FutureProvider.autoDispose<NotificationSettings>(
  (ref) => ref.watch(notificationsRepositoryProvider).settings(),
);

/// Имэйлийн мэдэгдлийн тохиргоо (`/app/notifications/settings`). Апп доторх мэдэгдэл үргэлж ирнэ.
class NotificationSettingsScreen extends ConsumerWidget {
  const NotificationSettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(notificationSettingsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Мэдэгдлийн тохиргоо')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(cards: 1),
        error: (e, _) => ErrorState(
          message: e is ApiError ? e.message : 'Мэдэгдлийн тохиргоог ачаалж чадсангүй.',
          onRetry: () => ref.invalidate(notificationSettingsProvider),
        ),
        data: (s) => _SettingsForm(initial: s),
      ),
    );
  }
}

class _SettingsForm extends ConsumerStatefulWidget {
  const _SettingsForm({required this.initial});

  final NotificationSettings initial;

  @override
  ConsumerState<_SettingsForm> createState() => _SettingsFormState();
}

class _SettingsFormState extends ConsumerState<_SettingsForm> {
  late NotificationSettings _value = widget.initial;
  bool _saving = false;

  Future<void> _save() async {
    setState(() => _saving = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final saved = await ref.read(notificationsRepositoryProvider).saveSettings(_value);
      if (!mounted) return;
      setState(() => _value = saved);
      messenger.showSnackBar(const SnackBar(content: Text('Тохиргоо хадгалагдлаа')));
    } on ApiError catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
      children: [
        Text(
          'Апп доторх мэдэгдэл үргэлж ирнэ. Энд зөвхөн имэйлээр авах эсэхээ сонгоно.',
          style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
        ),
        const SizedBox(height: AppSpace.lg),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              SwitchListTile(
                title: const Text('Долоо хоногийн тайлан'),
                subtitle: const Text('Хүүхдийн долоо хоногийн явцыг имэйлээр авах'),
                value: _value.emailWeekly,
                onChanged: _saving ? null : (v) => setState(() => _value = _value.copyWith(emailWeekly: v)),
              ),
              Divider(height: 1, color: context.colors.line),
              SwitchListTile(
                title: const Text('Сануулгын имэйл'),
                subtitle: const Text('Төлбөр, даалгавар, давталтын сануулга'),
                value: _value.emailReminders,
                onChanged: _saving ? null : (v) => setState(() => _value = _value.copyWith(emailReminders: v)),
              ),
            ],
          ),
        ),
        const SizedBox(height: AppSpace.xl),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: Text(_saving ? 'Хадгалж байна' : AppStrings.save),
        ),
      ],
    );
  }
}
