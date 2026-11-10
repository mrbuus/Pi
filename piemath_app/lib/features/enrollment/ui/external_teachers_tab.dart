import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/enrollment_providers.dart';
import '../data/enrollment_models.dart';
import '../data/enrollment_repository.dart';
import 'enrollment_actions.dart';
import 'enrollment_widgets.dart';

/// Баталгаажуулалт цуцлахын өмнө бичих үг (вэбтэй ижил).
const unverifyWord = 'ЦУЦЛАХ';

extension on ExternalTeacherState {
  String get label => switch (this) {
    ExternalTeacherState.pending => 'Хүлээгдэж буй',
    ExternalTeacherState.rejected => 'Татгалзсан',
    ExternalTeacherState.verified => 'Баталгаажсан',
  };

  String get emptyTitle => switch (this) {
    ExternalTeacherState.pending => 'Хүлээгдэж буй бүртгэл алга',
    ExternalTeacherState.rejected => 'Татгалзсан хүсэлт алга',
    ExternalTeacherState.verified => 'Баталгаажсан багш алга',
  };

  String get emptyMessage => switch (this) {
    ExternalTeacherState.pending => 'Шинэ гадны багш бүртгүүлэхэд энд харагдана',
    ExternalTeacherState.rejected => 'Татгалзсан бүртгэлүүд шалтгаантайгаа энд харагдана',
    ExternalTeacherState.verified => 'Баталгаажуулсан гадны багш энд бүртгэгдэнэ',
  };
}

/// «Гадны багш» (вэбийн `ExternalTeachersPanel`): бүртгэлийг хянаж баталгаажуулах, шалтгаантай татгалзах, дахин шалгах;
/// баталгаажуулалтыг цуцлах нь зөвхөн Админ. Юу ч устгахгүй — төлөв, тэмдэглэл л солигдоно.
class ExternalTeachersTab extends ConsumerStatefulWidget {
  const ExternalTeachersTab({super.key});

  @override
  ConsumerState<ExternalTeachersTab> createState() => _ExternalTeachersTabState();
}

class _ExternalTeachersTabState extends ConsumerState<ExternalTeachersTab> {
  ExternalTeacherState _view = ExternalTeacherState.pending;

  EnrollmentRepository get _repo => ref.read(enrollmentRepositoryProvider);

  Future<void> _reload() async {
    await ref.refresh(externalTeachersProvider.future).then((_) {}, onError: (_) {});
  }

  String _sub(ExternalTeacher t) => [t.email, ?t.organization].where((s) => s.isNotEmpty).join(', ');

  Future<void> _verify(ExternalTeacher t) async {
    final ok = await showFormSheet<bool>(
      context,
      title: '${t.name} багшийг баталгаажуулах уу',
      subtitle: _sub(t),
      submitLabel: 'Баталгаажуулах',
      fields: const [FormTextField(name: 'note', label: 'Тэмдэглэл', maxLines: 3, maxLength: 500)],
      onSubmit: (v) async {
        await _repo.verifyTeacher(t.id, note: v.text('note'));
        return true;
      },
    );
    if (ok != true || !mounted) return;
    enrollmentSnack(context, '${t.name} баталгаажлаа');
    await _reload();
  }

  Future<void> _reject(ExternalTeacher t) async {
    final ok = await showFormSheet<bool>(
      context,
      title: '${t.name} багшийн хүсэлтээс татгалзах уу',
      subtitle: _sub(t),
      submitLabel: 'Шалтгаантай татгалзах',
      fields: const [
        FormTextField(name: 'reason', label: 'Татгалзах шалтгаан', required: true, maxLines: 3, maxLength: 450),
      ],
      onSubmit: (v) async {
        await _repo.rejectTeacher(t.id, v.text('reason'));
        return true;
      },
    );
    if (ok != true || !mounted) return;
    setState(() => _view = ExternalTeacherState.rejected);
    enrollmentSnack(context, 'Хүсэлтээс татгалзлаа');
    await _reload();
  }

  Future<void> _reconsider(ExternalTeacher t) async {
    final ok = await confirmAction(
      context,
      title: 'Хүсэлтийг дахин шалгах уу',
      message: '${t.name} багшийн бүртгэл хүлээгдэж буй жагсаалт руу буцна. Өмнөх шалтгаан: ${t.rejectionReason ?? ''}',
      confirmLabel: 'Дахин шалгах',
      destructive: false,
    );
    if (!ok || !mounted) return;
    try {
      await _repo.reconsiderTeacher(t.id);
    } catch (e) {
      if (mounted) enrollmentSnack(context, enrollmentError(e, 'Хүсэлтийг дахин шалгахад шилжүүлж чадсангүй'));
      return;
    }
    if (!mounted) return;
    setState(() => _view = ExternalTeacherState.pending);
    enrollmentSnack(context, 'Хүлээгдэж буй руу буцлаа');
    await _reload();
  }

  Future<void> _unverify(ExternalTeacher t) async {
    final ok = await showFormSheet<bool>(
      context,
      title: 'Баталгаажуулалтыг цуцлах уу',
      subtitle: '${t.name} багшид шинэ бүлэг үүсгэх эрх хаагдана',
      submitLabel: 'Баталгаажуулалтыг цуцлах',
      fields: [
        FormTextField(
          name: 'confirm',
          label: 'Баталгаажуулахын тулд $unverifyWord гэж бичнэ үү',
          required: true,
          validator: (v) => v.trim() == unverifyWord ? null : '$unverifyWord гэж бичнэ үү',
        ),
      ],
      onSubmit: (_) async {
        await _repo.unverifyTeacher(t.id);
        return true;
      },
    );
    if (ok != true || !mounted) return;
    enrollmentSnack(context, 'Баталгаажуулалт цуцлагдлаа');
    await _reload();
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(externalTeachersProvider);
    final access = ref.watch(enrollmentAccessProvider);
    final data = async.value;
    final rows = data?.of(_view) ?? const <ExternalTeacher>[];
    return TabScroll(
      onRefresh: _reload,
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.only(top: AppSpace.sm),
            child: Row(
              children: [
                Expanded(
                  child: Wrap(
                    spacing: AppSpace.sm,
                    children: [
                      for (final s in ExternalTeacherState.values)
                        PickChip(
                          key: ValueKey('ext:${s.name}'),
                          label: data == null ? s.label : '${s.label} ${data.of(s).length}',
                          selected: _view == s,
                          onSelected: () => setState(() => _view = s),
                        ),
                    ],
                  ),
                ),
                const InfoHint(
                  title: 'Гадны багшийн эрх',
                  message:
                      'Баталгаажаагүй гадны багш шинэ бүлэг үүсгэх боломжгүй. Сурагчид баталгаажаагүй багшийн бүлэгт нэгдэх боломжгүй',
                ),
              ],
            ),
          ),
        ),
        if (async.isLoading && !async.hasValue)
          const SliverState(height: 420, child: LoadingState(padding: EdgeInsets.zero))
        else if (async.hasError && !async.hasValue)
          SliverState(
            child: ErrorState(
              message: enrollmentError(async.error!, 'Багшийн мэдээллийг авч чадсангүй'),
              onRetry: () => ref.invalidate(externalTeachersProvider),
            ),
          )
        else if (rows.isEmpty)
          SliverState(
            child: EmptyState(icon: AppIcons.badgeCheck, title: _view.emptyTitle, message: _view.emptyMessage),
          )
        else
          SliverList.builder(
            itemCount: rows.length,
            itemBuilder: (_, i) {
              final t = rows[i];
              return Padding(
                padding: const EdgeInsets.only(top: AppSpace.sm),
                child: _TeacherCard(
                  teacher: t,
                  canUnverify: access.canUnverify,
                  onVerify: () => _verify(t),
                  onReject: () => _reject(t),
                  onReconsider: () => _reconsider(t),
                  onUnverify: () => _unverify(t),
                ),
              );
            },
          ),
      ],
    );
  }
}

class _TeacherCard extends StatelessWidget {
  const _TeacherCard({
    required this.teacher,
    required this.canUnverify,
    required this.onVerify,
    required this.onReject,
    required this.onReconsider,
    required this.onUnverify,
  });

  final ExternalTeacher teacher;
  final bool canUnverify;
  final VoidCallback onVerify;
  final VoidCallback onReject;
  final VoidCallback onReconsider;
  final VoidCallback onUnverify;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final t = teacher;
    final small = context.text.bodySmall?.copyWith(color: c.inkDim);
    const tall = Size(48, 48);
    final actions = switch (t.state) {
      ExternalTeacherState.pending => [
        FilledButton.icon(
          style: FilledButton.styleFrom(minimumSize: tall),
          onPressed: onVerify,
          icon: const Icon(AppIcons.check, size: 18),
          label: const Text('Баталгаажуулах'),
        ),
        OutlinedButton(
          style: OutlinedButton.styleFrom(minimumSize: tall, foregroundColor: c.error),
          onPressed: onReject,
          child: const Text('Татгалзах'),
        ),
      ],
      ExternalTeacherState.rejected => [
        OutlinedButton(
          style: OutlinedButton.styleFrom(minimumSize: tall),
          onPressed: onReconsider,
          child: const Text('Хүлээгдэж буй руу буцаах'),
        ),
      ],
      ExternalTeacherState.verified => [
        if (canUnverify)
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(minimumSize: tall, foregroundColor: c.error),
            onPressed: onUnverify,
            icon: const Icon(AppIcons.undo, size: 18),
            label: const Text('Баталгаажуулалт цуцлах'),
          ),
      ],
    };
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(t.name, style: context.text.titleSmall),
          const SizedBox(height: AppSpace.xs),
          Text(t.email, style: small),
          if (t.organization != null) ...[
            const SizedBox(height: 2),
            Row(
              children: [
                Icon(AppIcons.classes, size: 14, color: c.inkDim),
                const SizedBox(width: AppSpace.xs),
                Expanded(child: Text(t.organization!, style: small)),
              ],
            ),
          ],
          const SizedBox(height: AppSpace.xs),
          switch (t.state) {
            ExternalTeacherState.pending => Text('Бүртгүүлсэн: ${enrollmentDate(t.createdAt)}', style: small),
            ExternalTeacherState.rejected => Text(
              'Шалтгаан: ${t.rejectionReason ?? ''}',
              style: context.text.bodySmall?.copyWith(color: c.error),
            ),
            ExternalTeacherState.verified => Meta(
              items: ['Баталгаажсан: ${enrollmentDate(t.verifiedAt)}', 'Бүлэг: ${t.groupCount}'],
            ),
          },
          if (t.state == ExternalTeacherState.verified && t.note != null) ...[
            const SizedBox(height: AppSpace.xs),
            Text('Тэмдэглэл: ${t.note}', style: small),
          ],
          if (actions.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            Wrap(spacing: AppSpace.sm, runSpacing: AppSpace.sm, children: actions),
          ],
        ],
      ),
    );
  }
}
