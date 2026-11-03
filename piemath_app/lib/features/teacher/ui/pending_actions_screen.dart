import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../application/staff_providers.dart';
import '../application/teacher_providers.dart';
import '../data/staff_models.dart';
import '../data/staff_repository.dart';
import 'board_other_info.dart';
import 'staff_widgets.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

/// Хүлээгдэж буй (`/app/teacher/pending`, Багш+ ба Админ): эцэг эхийн холболт, шинэ сурагч зөвшөөрөх,
/// төлбөр баталгаажуулах. Хөнгөн өдөр тутмын үйлдэл л; нарийн удирдлага вэбээр. Эрхийг сервер шийднэ (403 бол тайлбар).
class PendingActionsScreen extends ConsumerWidget {
  const PendingActionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(title: const Text('Хүлээгдэж буй')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          const ParentRequestsBlock(),
          const SizedBox(height: AppSpace.xl),
          const _PendingStudents(),
          const SizedBox(height: AppSpace.xl),
          const _PendingPayments(),
          const SizedBox(height: AppSpace.xl),
          AppCard(
            onTap: () => context.push('/app/admin/leads'),
            child: Row(
              children: [
                Icon(AppIcons.enroll, color: c.brand),
                const SizedBox(width: AppSpace.md),
                const Expanded(child: Text('Элсэлтийн хүсэлтүүд')),
                Icon(AppIcons.forward, color: c.inkDim),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

Future<bool> _confirm(BuildContext context, {required String title, required String body, required String action}) async {
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text(title),
      content: Text(body),
      actions: [
        TextButton(
          style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
          onPressed: () => Navigator.pop(ctx, false),
          child: const Text('Болих'),
        ),
        FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(action),
        ),
      ],
    ),
  );
  return ok ?? false;
}

class _PendingStudents extends ConsumerStatefulWidget {
  const _PendingStudents();

  @override
  ConsumerState<_PendingStudents> createState() => _PendingStudentsState();
}

class _PendingStudentsState extends ConsumerState<_PendingStudents> {
  String? _busy;
  String? _msg;

  Future<void> _approve(PendingStudent s) async {
    if (!await _confirm(context, title: 'Сурагч зөвшөөрөх', body: '${s.name}-г зөвшөөрөх үү?', action: 'Зөвшөөрөх')) return;
    setState(() {
      _busy = s.id;
      _msg = null;
    });
    try {
      await ref.read(staffRepositoryProvider).approveStudent(s.id);
      _msg = '${s.name} зөвшөөрөгдлөө';
      ref.invalidate(pendingStudentsProvider);
    } catch (e) {
      _msg = errorText(e, 'Зөвшөөрч чадсангүй, дахин оролдоно уу');
    }
    if (mounted) setState(() => _busy = null);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(pendingStudentsProvider);
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Зөвшөөрөл хүлээж буй сурагчид', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        if (_msg != null) ...[
          Semantics(liveRegion: true, child: Text(_msg!, style: context.text.bodySmall)),
          const SizedBox(height: AppSpace.sm),
        ],
        async.when(
          skipLoadingOnRefresh: false,
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => InlineError(
            message: errorText(e, 'Жагсаалт нээгдсэнгүй'),
            onRetry: () => ref.invalidate(pendingStudentsProvider),
          ),
          data: (list) => list.isEmpty
              ? Text('Зөвшөөрөл хүлээж буй сурагч алга', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
              : AppCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (final (i, s) in list.indexed) ...[
                        if (i > 0) Divider(height: 1, color: c.line),
                        Padding(
                          padding: const EdgeInsets.all(AppSpace.md),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(s.name, style: context.text.titleSmall),
                                    Meta(
                                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                                      items: [
                                        s.phone ?? 'утас алга',
                                        if (s.grade != null) '${s.grade}-р анги',
                                        switch (s.hasConfirmedPayment) {
                                          true => 'эхний төлбөр баталгаажсан',
                                          false => 'эхний төлбөр баталгаажаагүй',
                                          null => null,
                                        },
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              FilledButton(
                                style: FilledButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                                onPressed: _busy == s.id ? null : () => _approve(s),
                                child: const Text('Зөвшөөрөх'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}

class _PendingPayments extends ConsumerStatefulWidget {
  const _PendingPayments();

  @override
  ConsumerState<_PendingPayments> createState() => _PendingPaymentsState();
}

class _PendingPaymentsState extends ConsumerState<_PendingPayments> {
  String? _busy;
  String? _msg;

  Future<void> _confirmPayment(PendingPayment p) async {
    final ok = await _confirm(
      context,
      title: 'Төлбөр баталгаажуулах',
      body: '${p.userName}, ${p.amount}₮${p.forMonth == null ? '' : ', ${p.forMonth}'}. Баталгаажуулах уу?',
      action: 'Баталгаажуулах',
    );
    if (!ok) return;
    setState(() {
      _busy = p.id;
      _msg = null;
    });
    try {
      await ref.read(staffRepositoryProvider).confirmPayment(p.id);
      _msg = 'Баталгаажлаа';
      ref.invalidate(pendingPaymentsProvider);
    } catch (e) {
      _msg = errorText(e, 'Баталгаажуулж чадсангүй, дахин оролдоно уу');
    }
    if (mounted) setState(() => _busy = null);
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(pendingPaymentsProvider);
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Хүлээгдэж буй төлбөр', style: context.text.titleSmall),
        const SizedBox(height: AppSpace.sm),
        if (_msg != null) ...[
          Semantics(liveRegion: true, child: Text(_msg!, style: context.text.bodySmall)),
          const SizedBox(height: AppSpace.sm),
        ],
        async.when(
          skipLoadingOnRefresh: false,
          loading: () => const LinearProgressIndicator(),
          error: (e, _) => InlineError(
            message: errorText(e, 'Төлбөрийн жагсаалт нээгдсэнгүй'),
            onRetry: () => ref.invalidate(pendingPaymentsProvider),
          ),
          data: (list) => list.isEmpty
              ? Text('Хүлээгдэж буй төлбөр алга', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
              : AppCard(
                  padding: EdgeInsets.zero,
                  child: Column(
                    children: [
                      for (final (i, p) in list.indexed) ...[
                        if (i > 0) Divider(height: 1, color: c.line),
                        Padding(
                          padding: const EdgeInsets.all(AppSpace.md),
                          child: Row(
                            children: [
                              Icon(TeacherIcons.wallet, color: c.inkDim),
                              const SizedBox(width: AppSpace.md),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(p.userName, style: context.text.titleSmall),
                                    Meta(
                                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                                      items: ['${p.amount}₮', p.method, p.forMonth, p.phone],
                                    ),
                                    if (p.description != null) Text(p.description!, style: context.text.bodySmall),
                                  ],
                                ),
                              ),
                              FilledButton(
                                style: FilledButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                                onPressed: _busy == p.id ? null : () => _confirmPayment(p),
                                child: const Text('Баталгаажуулах'),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
        ),
      ],
    );
  }
}
