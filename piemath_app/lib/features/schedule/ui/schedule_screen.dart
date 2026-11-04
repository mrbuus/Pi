import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/ics_opener.dart';
import '../data/schedule_repository.dart';
import 'schedule_view.dart';
import 'staff/staff_schedule_screen.dart';

/// `/app/schedule` — сурагч: тогтмол хуваарь + 7 хоног (вэбд «Хичээл» hub-ийн «Хуваарь» таб);
/// эцэг эх: хүүхдийн ангийн 7 хоногийн хичээл (`/schedule/week` — эцэг эхэд зөвшөөрөгдсөн).
/// Ажилтан (Багш, Багш+, Админ): бүтэн нативаар — [StaffScheduleScreen].
class ScheduleScreen extends ConsumerWidget {
  const ScheduleScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref.watch(sessionProvider);
    final role = session is SignedIn ? session.role : UserRole.unknown;
    if (role.isStaff) return const StaffScheduleScreen();
    final Widget body = switch (role) {
      UserRole.student => const ScheduleView(showPattern: true),
      UserRole.parent || UserRole.buyer => const ScheduleView(showPattern: false),
      _ => const EmptyState(
        icon: AppIcons.calendar,
        title: 'Хуваарь алга',
        message: 'Энэ хэсэг танхимын сурагч, багш, удирдлагад зориулагдсан',
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

/// «Утасны хуанлид нэмэх» — `/schedule/me/ics` татаж, системийн хуваалцах цонхоор хуанлийн апп руу өгнө. Зөвхөн товшиход ажиллана.
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
      } else if (!mounted) {
        return;
      } else if (!await ref.read(icsOpenerProvider).open(export, origin: _origin())) {
        message = 'Хуваарийн файлыг хуваалцаж чадсангүй. Дахин оролдоно уу';
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

  /// iPad-ийн хуваалцах цонх товчны дэргэд гарахын тулд.
  Rect? _origin() {
    final box = context.findRenderObject();
    if (box is! RenderBox || !box.hasSize) return null;
    return box.localToGlobal(Offset.zero) & box.size;
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
