import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart' show ChipTone, MetaChip;
import '../../../shared/payment_status/payment_status.dart';
import '../data/ledger.dart';
import '../data/payments_repository.dart';
import '../domain/ledger_format.dart';
import '../domain/payment_history.dart';
import 'ledger_sheets.dart';
import 'month_blocks.dart';

/// Төлбөрийн ledger унших (вэбийн `/app/payments`, `ClassOverview` → `ClassBoard` → `StudentLedger`).
/// Эрх (ADMIN, Багш+ `finance.manage`) ба ямар дүн харагдах — БҮГД серверт. Апп нэмэлт шүүлтгүй,
/// тоо зохиохгүй: сервер өгөөгүй талбар дэлгэцэд гарахгүй. 403 — төвийг сахисан тайлбар.

/// Ачаалал / 403 / алдаа+дахин / өгөгдөл — гурван дэлгэцэд нэг загвар.
class _LedgerAsync<T> extends StatelessWidget {
  const _LedgerAsync({required this.value, required this.onRetry, required this.data});

  final AsyncValue<T> value;
  final VoidCallback onRetry;
  final Widget Function(T) data;

  @override
  Widget build(BuildContext context) {
    return value.when(
      skipLoadingOnRefresh: false,
      loading: () => ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: const [SkeletonPulse(child: SkeletonCard(lines: 4))],
      ),
      error: (e, _) => e is ApiError && e.kind == ApiErrorKind.forbidden
          ? const EmptyState(
              icon: AppIcons.info,
              title: 'Төлбөрийн мэдээлэл танд харагдахгүй',
              message: 'Энэ хэсгийг төвийн эрх бүхий ажилтан харна.',
            )
          : ErrorState(message: e is ApiError ? e.message : AppStrings.genericError, onRetry: onRetry),
      data: data,
    );
  }
}

/// Төлөв: дүрс + үг (өнгө зөвхөн дүрсэнд).
class LedgerStateLabel extends StatelessWidget {
  const LedgerStateLabel(this.state, {super.key});

  final LedgerState state;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (icon, tone) = switch (state) {
      LedgerState.paid => (AppIcons.success, c.success),
      LedgerState.partial || LedgerState.owed => (AppIcons.failure, c.error),
      LedgerState.future => (AppIcons.upcoming, c.info),
      LedgerState.off || LedgerState.unknown => (AppIcons.circleDot, c.inkDim),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 16, color: tone),
        const SizedBox(width: AppSpace.xs),
        Text(state.label, style: context.text.labelMedium),
      ],
    );
  }
}

Widget _rows(BuildContext context, List<Widget> rows) => AppCard(
  padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.xs),
  child: Column(
    children: [
      for (var i = 0; i < rows.length; i++) ...[if (i > 0) Divider(height: 1, color: context.colors.line), rows[i]],
    ],
  ),
);

class _Tile extends StatelessWidget {
  const _Tile({required this.title, this.meta = const [], this.trailing, this.onTap});

  final String title;
  final List<String?> meta;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: AppSizes.minTap),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: context.text.titleSmall),
                    if (meta.any((m) => m != null && m.isNotEmpty)) Meta(items: meta),
                  ],
                ),
              ),
              ?trailing,
              if (onTap != null) Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
            ],
          ),
        ),
      ),
    );
  }
}

class _Fact extends StatelessWidget {
  const _Fact(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: context.text.bodySmall),
        const SizedBox(height: 2),
        Text(value, style: context.text.titleMedium),
      ],
    );
  }
}

/// Хоосон биш баримтуудыг (сервер өгсөн) 2 баганаар.
Widget _facts(List<(String, String?)> items) {
  final shown = [
    for (final (l, v) in items)
      if (v != null) _Fact(l, v),
  ];
  if (shown.isEmpty) return const SizedBox.shrink();
  return AppCard(
    child: Wrap(spacing: AppSpace.xl, runSpacing: AppSpace.md, children: shown),
  );
}

String? _ratio(int? a, int? b) => a == null || b == null ? null : '$a / $b';
String? _mnt(int? v) => v == null ? null : formatMnt(v);

/// Мөнгөн дүнг зөвхөн Админ харна; Багш+ зөвхөн төлөв (эзний прод дүрэм) — сервер дүн буцаасан ч.
final canSeeLedgerAmountsProvider = Provider<bool>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn && s.role == UserRole.admin;
});
String? _month(String m) => m.length == 7 ? paymentMonthLabel(m) : null;

/// `/app/payments` — ангиудын товч.
class LedgerOverviewScreen extends ConsumerWidget {
  const LedgerOverviewScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Төлбөр')),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.refresh(ledgerOverviewProvider.future).catchError((_) => const LedgerOverview(month: '', totals: null)),
        child: _LedgerAsync(
          value: ref.watch(ledgerOverviewProvider),
          onRetry: () => ref.invalidate(ledgerOverviewProvider),
          data: (o) => _overview(context, o, ref.watch(canSeeLedgerAmountsProvider)),
        ),
      ),
    );
  }

  Widget _overview(BuildContext context, LedgerOverview o, bool money) => ListView(
    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
    children: [
      if (_month(o.month) case final m?) SectionHeader(title: m),
      _facts([
        ('Сурагч', o.totals?.students?.toString()),
        ('Энэ сард төлсөн', _ratio(o.totals?.covered, o.totals?.expected)),
        ('Өртэй сурагч', o.totals?.owedStudents?.toString()),
        if (money) ('Нийт өр', _mnt(o.totals?.owedNow)),
      ]),
      const SectionHeader(title: 'Ангиуд'),
      if (o.classes.isEmpty)
        const AppCard(
          child: SizedBox(
            height: 200,
            child: EmptyState(icon: AppIcons.payments, title: 'Анги бүртгэгдээгүй байна'),
          ),
        )
      else
        _rows(context, [
          for (final c in o.classes)
            _Tile(
              title: c.name,
              meta: [
                if (_ratio(c.covered, c.expected) case final r?) '$r төлсөн',
                if (c.owedStudents case final n? when n > 0) '$n өртэй',
              ],
              onTap: () => context.push('/app/payments/class/${Uri.encodeComponent(c.id)}'),
            ),
        ]),
    ],
  );
}

/// `/app/payments/class/:id` — ангийн сурагч бүрийн энэ сарын төлөв.
class LedgerClassScreen extends ConsumerWidget {
  const LedgerClassScreen({super.key, required this.classroomId});

  final String classroomId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(ledgerBoardProvider(classroomId));
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: Text(async.value?.classroom ?? 'Анги')),
      body: _LedgerAsync(
        value: async,
        onRetry: () => ref.invalidate(ledgerBoardProvider(classroomId)),
        data: (b) => ListView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
          children: [
            if (_month(b.month) case final m?) SectionHeader(title: m),
            if (b.rows.isEmpty)
              const AppCard(
                child: SizedBox(
                  height: 200,
                  child: EmptyState(icon: AppIcons.children, title: 'Сурагч алга'),
                ),
              )
            else
              _rows(context, [
                for (final r in b.rows)
                  _Tile(
                    title: r.name,
                    meta: [r.code, if (r.owedNow case final v? when v > 0) 'Өр ${formatMnt(v)}'],
                    trailing: r.blockOf(b.month) == null ? null : LedgerStateLabel(r.blockOf(b.month)!.state),
                    onTap: () => context.push('/app/payments/student/${Uri.encodeComponent(r.id)}'),
                  ),
              ]),
          ],
        ),
      ),
    );
  }
}

/// `/app/payments/student/:id` — нэг сурагчийн ledger: серверийн үнэ, багц, сарын блок (хамрах хугацаа,
/// сунгалт), хугацаа сунгах, төлбөрүүд. Мөнгөн дүнг зөвхөн Админ харна (сервер ч Багш+-д хасна).
class LedgerStudentScreen extends ConsumerWidget {
  const LedgerStudentScreen({super.key, required this.studentId});

  final String studentId;

  Future<void> _plan(BuildContext context, WidgetRef ref, StudentLedger s) async {
    if (await showPlanSheet(context, s)) ref.invalidate(ledgerStudentProvider(studentId));
  }

  Future<void> _extend(BuildContext context, WidgetRef ref, StudentLedger s) async {
    await showExtendSheet(context, s);
    ref.invalidate(ledgerStudentProvider(studentId));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(ledgerStudentProvider(studentId));
    final canSee = ref.watch(canSeeLedgerAmountsProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: Text(async.value?.row.name ?? 'Сурагч')),
      body: _LedgerAsync(
        value: async,
        onRetry: () => ref.invalidate(ledgerStudentProvider(studentId)),
        data: (s) {
          final money = canSee && !s.amountsHidden;
          final r = s.row;
          return RefreshIndicator(
            onRefresh: () => ref.refresh(ledgerStudentProvider(studentId).future).then((_) {}, onError: (_) {}),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
              children: [
                Meta(items: [r.classroom, r.code, if (r.startDate != null) '${dayLabel(r.startDate)}-нээс']),
                const SizedBox(height: AppSpace.md),
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    key: const Key('ledger-plan'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(AppSizes.minTap, AppSizes.minTap),
                      foregroundColor: r.plan.guessed ? context.colors.error : null,
                    ),
                    onPressed: () => unawaited(_plan(context, ref, s)),
                    icon: const Icon(AppIcons.pencilLine, size: 18),
                    label: Text(ledgerPlanText(r.plan, money: money)),
                  ),
                ),
                if (r.plan.autoFull)
                  const _Note(
                    icon: AppIcons.success,
                    tone: ChipTone.success,
                    text: 'Суудал баталгаажуулах төлбөр ба үлдэгдлээр бүтэн жил төлөгдсөн',
                  ),
                if (r.plan.fullYearLate && !r.plan.settled)
                  const _Note(
                    icon: AppIcons.warning,
                    tone: ChipTone.error,
                    text: 'Бүтэн жилийн дүн төлсөн ч үлдэгдлийг хугацаанаас хойш төлсөн. Шалгаад тохирвол «Бүрэн» болгоно',
                  ),
                const SizedBox(height: AppSpace.md),
                _facts([
                  ('7 хоногт', s.daysPerWeek == null ? null : '${s.daysPerWeek} өдөр'),
                  if (money) ...[
                    ('Сарын төлбөр', _mnt(s.tier?.monthly)),
                    ('Бүтэн жил', _mnt(s.tier?.fullYear)),
                    ('Төлсөн', _mnt(s.paidTotal)),
                    if ((r.credit ?? 0) > 0) ('Илүү төлсөн', _mnt(r.credit)) else ('Үлдэгдэл', _mnt(s.remaining)),
                    ('Өр', _mnt(r.owedNow)),
                  ] else ...[
                    ('Төлсөн хүртэл', r.coveredThrough == null ? 'Үгүй' : monthName(r.coveredThrough!)),
                    ('Өр', r.owedMonths > 0 ? '${r.owedMonths} сар' : 'Өргүй'),
                  ],
                  if (r.overdueDays > 0) ('Хэтэрсэн', '${r.overdueDays} хоног'),
                ]),
                const SectionHeader(
                  title: 'Сар бүрийн төлөв',
                  trailing: InfoHint(title: 'Блокийн тайлбар', message: blockLegendText),
                ),
                if (r.blocks.isEmpty)
                  const AppCard(child: Text('Сарын мэдээлэл алга'))
                else
                  MonthBlocks(blocks: r.blocks, money: money, settled: r.plan.settled, current: s.month),
                if (s.canExtend) ...[
                  const SizedBox(height: AppSpace.md),
                  OutlinedButton.icon(
                    key: const Key('ledger-extend'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                    onPressed: () => unawaited(_extend(context, ref, s)),
                    icon: const Icon(AppIcons.calendarRange, size: 18),
                    label: Text(s.extensions.isEmpty ? 'Хугацаа сунгах' : 'Хугацаа сунгах (${s.extensions.length})'),
                  ),
                ],
                if ([r.phone, s.fatherPhone, s.motherPhone].any((p) => p != null)) ...[
                  const SizedBox(height: AppSpace.md),
                  Wrap(
                    spacing: AppSpace.sm,
                    runSpacing: AppSpace.sm,
                    children: [
                      for (final (label, phone) in [
                        ('Сурагч', r.phone),
                        ('Аав', s.fatherPhone),
                        ('Ээж', s.motherPhone),
                      ])
                        if (phone != null) PhoneCallChip(label: label, phone: phone),
                    ],
                  ),
                ],
                if (money) const SectionHeader(title: 'Төлбөрүүд'),
                if (!money)
                  const SizedBox.shrink()
                else if (s.payments.isEmpty)
                  const AppCard(child: Text('Төлбөр бүртгэгдээгүй байна'))
                else
                  _rows(context, [
                    for (final p in s.payments)
                      if (p.amount case final amount?)
                        PaymentRow(
                          status: PaymentStatus.fromApi(p.status),
                          amount: amount,
                          dateLabel: p.date == null ? '' : isoDateLabel(p.date!),
                          meta: [
                            if (p.forMonth case final m?) '${paymentMonthLabel(m)}ын төлбөр',
                            paymentMethodLabel(p.method),
                          ],
                        )
                      else
                        _Tile(
                          title: PaymentStatus.fromApi(p.status).label,
                          meta: [if (p.date case final d?) isoDateLabel(d)],
                        ),
                  ]),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Багцын товчны бичвэр (вэбийн `StudentLedger` planText). Мөнгө харахгүй бол дүнгүй.
String ledgerPlanText(LedgerPlan p, {required bool money}) {
  if (p.settled) return 'Бүтэнд тооцсон';
  if (p.guessed) return 'Багц тодорхойгүй';
  final amount = money ? mntOrEmpty(p.kind == PlanKind.monthly ? p.fee : p.total) : '';
  return '${p.kind.label} $amount'.trim();
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.tone, required this.text});

  final IconData icon;
  final ChipTone tone;
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: AppSpace.sm),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: MetaChip.toneColor(context, tone)),
        const SizedBox(width: AppSpace.sm),
        Expanded(child: Text(text, style: context.text.bodyMedium)),
      ],
    ),
  );
}

/// Утас руу залгах товч («Аав 99112233»).
class PhoneCallChip extends StatelessWidget {
  const PhoneCallChip({super.key, required this.label, required this.phone});

  final String label;
  final String phone;

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    style: OutlinedButton.styleFrom(minimumSize: const Size(AppSizes.minTap, AppSizes.minTap)),
    onPressed: () => unawaited(launchUrl(Uri.parse('tel:${phone.replaceAll(RegExp(r'\s'), '')}'))),
    icon: const Icon(AppIcons.phone, size: 18),
    label: Text('$label $phone'),
  );
}
