import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../application/enrollment_providers.dart';
import 'approval_tab.dart';
import 'external_teachers_tab.dart';
import 'windows_tab.dart';

/// Элсэлтийн удирдлага (`/app/admin/enrollment`, вэбийн `app/app/admin/enrollment/page.tsx`):
/// Элсэлтийн цонх, Зөвшөөрөл хүлээгч, Гадны багш.
///
/// Нээх нь Админ, Багш+ (сервертэй ижил). Бусад role-д тайлбар л харагдана, хүсэлт явуулахгүй.
class EnrollmentScreen extends ConsumerWidget {
  const EnrollmentScreen({super.key});

  static const path = '/app/admin/enrollment';

  static const title = 'Элсэлтийн удирдлага';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(enrollmentAccessProvider);
    if (!access.canManage) {
      return Scaffold(
        appBar: AppBar(title: const Text(title)),
        body: const EmptyState(
          icon: AppIcons.shield,
          title: 'Энэ хэсэг Админ, Багш+ хэрэглэгчид',
          message: AppStrings.forbidden,
        ),
      );
    }
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text(title),
          bottom: const TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              Tab(text: 'Элсэлтийн цонх'),
              Tab(text: 'Зөвшөөрөл хүлээгч'),
              Tab(text: 'Гадны багш'),
            ],
          ),
        ),
        body: const TabBarView(children: [WindowsTab(), ApprovalTab(), ExternalTeachersTab()]),
      ),
    );
  }
}
