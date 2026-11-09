import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/sms_repository.dart';
import '../domain/sms_logic.dart';
import 'sms_history_tab.dart';
import 'sms_send_tab.dart';
import 'sms_templates_tab.dart';

final smsAccessProvider = Provider<SmsAccess>((ref) {
  final s = ref.watch(sessionProvider);
  return SmsAccess(s is SignedIn ? s.role : null);
});

/// Дугаарлуу мессеж (`/app/sms`, вэбийн `app/app/sms/page.tsx`): Төлөв, Илгээх, Түүх, Загвар.
///
/// Харах нь Админ, Багш+; илгээх, дахин илгээх, загвар засах нь зөвхөн Админ (сервертэй ижил).
/// Багш+-д «Илгээх» таб гарахгүй, загвар зөвхөн харагдана.
class SmsScreen extends ConsumerWidget {
  const SmsScreen({super.key});

  static const path = '/app/sms';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(smsAccessProvider);
    if (!access.canView) {
      return Scaffold(
        appBar: AppBar(title: const Text('Дугаарлуу мессеж')),
        body: const EmptyState(
          icon: AppIcons.shield,
          title: 'Энэ хэсэг Админ, Багш+ хэрэглэгчид',
          message: AppStrings.forbidden,
        ),
      );
    }
    final tabs = [
      const Tab(text: 'Төлөв'),
      if (access.canSend) const Tab(text: 'Илгээх'),
      const Tab(text: 'Түүх'),
      const Tab(text: 'Загвар'),
    ];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Дугаарлуу мессеж'),
          bottom: TabBar(isScrollable: true, tabAlignment: TabAlignment.start, tabs: tabs),
        ),
        body: TabBarView(
          children: [
            const SmsStatusTab(),
            if (access.canSend) const SmsSendTab(),
            SmsHistoryTab(canRetry: access.canRetry),
            SmsTemplatesTab(canManage: access.canManageTemplates),
          ],
        ),
      ),
    );
  }
}

/// Нийлүүлэгч тохируулагдсан эсэх, энэ сарын хэрэглээ.
class SmsStatusTab extends ConsumerWidget {
  const SmsStatusTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(smsStatusProvider);
    return async.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(cards: 2),
      error: (e, _) => ErrorState(
        message: e is ApiError ? e.message : AppStrings.genericError,
        onRetry: () => ref.invalidate(smsStatusProvider),
      ),
      data: (s) => RefreshIndicator(
        onRefresh: () => ref.refresh(smsStatusProvider.future),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.lg, AppSpace.gutter, AppSpace.xxl),
              sliver: SliverList.list(
                children: [
                  AppCard(
                    accent: s.configured ? context.colors.success : context.colors.error,
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          s.configured ? AppIcons.success : AppIcons.warning,
                          color: s.configured ? context.colors.success : context.colors.error,
                        ),
                        const SizedBox(width: AppSpace.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                s.configured ? 'SMS илгээлт идэвхтэй' : 'SMS илгээлт тохируулаагүй',
                                style: context.text.titleSmall,
                              ),
                              const SizedBox(height: AppSpace.xs),
                              Text(
                                s.configured
                                    ? 'Нийлүүлэгч ${s.provider ?? ''}'.trim()
                                    : 'Нийлүүлэгч тохируулагдах хүртэл мессеж илгээгдэхгүй',
                                style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (s.configured) ...[
                    const SectionHeader(title: 'Энэ сарын хэрэглээ'),
                    StatRow(
                      tiles: [
                        StatTile(label: 'Бүртгэгдсэн мессеж', value: '${s.thisMonthCount}', icon: AppIcons.message),
                        StatTile(
                          label: 'Амжилттай хэсэг',
                          value: '${s.thisMonthSegments}',
                          icon: AppIcons.success,
                          tone: ChipTone.success,
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
