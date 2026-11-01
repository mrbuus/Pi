import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/config/env.dart';
import '../../../core/ui/ui.dart';
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
      appBar: AppBar(title: const Text('Хуваарь')),
      body: body,
    );
  }
}
