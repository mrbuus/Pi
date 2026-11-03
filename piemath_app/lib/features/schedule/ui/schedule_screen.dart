import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/config/env.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/ics_opener.dart';
import '../data/schedule_repository.dart';
import 'schedule_view.dart';

/// `/app/schedule` — сурагч: тогтмол хуваарь + 7 хоног (вэбд «Хичээл» hub-ийн «Хуваарь» таб);
/// эцэг эх: хүүхдийн ангийн 7 хоногийн хичээл (`/schedule/week` — эцэг эхэд зөвшөөрөгдсөн).
/// Ажилтны хуваарь (засвар, ерөнхий тор) — одоогоор вэбээр.
class ScheduleScreen extends ConsumerWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final role = session is SignedIn ? session.role : UserRole.unknown;
    final Widget body = switch (role) {
      UserRole.student => const ScheduleView(showPattern: true),
      UserRole.parent || UserRole.buyer => const ScheduleView(showPattern: false),
      _ => EmptyState(
          icon: AppIcons.calendar,
          title: 'Ажилтны хуваарь удахгүй апп-д нэмэгдэнэ',
          message: 'Одоогоор вэб хуудсаар ашиглах боломжтой',
          action: OutlinedButton.icon(
            icon: const Icon(AppIcons.forward, size: 18),
            label: const Text('Вэбээр нээх'),
            onPressed: () =>
                launchUrl(Uri.parse('${Env.webBaseUrl}/app/schedule'), mode: LaunchMode.externalApplication),
          ),
        ),
    };
    return Scaffold(
      appBar: AppBar(
        title: const Text('Хуваарь'),
        actions: [if (role == UserRole.student) const _CalendarExportButton()],
      ),
      body: body,
    );
  }
}

/// «Утасны хуанлид нэмэх» — `/schedule/me/ics` татаж, хуанлийн апп руу нээнэ. Зөвхөн товшиход ажиллана.
class _CalendarExportButton extends ConsumerStatefulWidget {
  const _CalendarExportButton();

  @override
  ConsumerState<_CalendarExportButton> createState() => _CalendarExportButtonState();
}

class _CalendarExportButtonState extends ConsumerState<_CalendarExportButton> {
  bool _busy = false;

  Future<void> _export() async {
    if (_busy) return;
    final messenger = ScaffoldMessenger.of(context);
    setState(() => _busy = true);
    String? message;
    try {
      final export = await ref.read(scheduleRepositoryProvider).exportIcs();
      if (!export.hasEvents) {
        message = 'Хуанлид нэмэх хичээл одоогоор алга';
      } else if (!await ref.read(icsOpenerProvider).open(export.ics)) {
        message = 'Хуваарийн файлыг нээж чадсангүй. Дахин оролдоно уу';
      }
    } catch (e) {
      message = e is ApiError ? e.message : 'Хуваарийн файлыг татаж чадсангүй. Дахин оролдоно уу';
    } finally {
      if (mounted) setState(() => _busy = false);
    }
    if (message != null) {
      messenger
        ..hideCurrentSnackBar()
        ..showSnackBar(SnackBar(content: Text(message)));
    }
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Утасны хуанлид нэмэх',
      onPressed: _busy ? null : _export,
      icon: _busy
          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
          : const Icon(AppIcons.calendarCheck),
    );
  }
}
