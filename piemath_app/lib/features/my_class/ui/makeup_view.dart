import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../data/hub_models.dart';
import '../data/my_class_repository.dart';
import '../domain/hub_logic.dart';
import 'common.dart';
import 'photo_viewer.dart';

/// Нөхөх хичээлийн төлөвийн шошго (вэбийн `makeup/types.ts` `STATUS_META`).
({String label, IconData icon, MarkTone tone}) makeupStatusMeta(MakeupStatus s) => switch (s) {
  MakeupStatus.pending => (label: 'Нөхөөгүй', icon: AppIcons.circleDashed, tone: MarkTone.error),
  MakeupStatus.partial => (label: 'Дутуу', icon: AppIcons.circleDot, tone: MarkTone.warning),
  MakeupStatus.done => (label: 'Нөхсөн', icon: AppIcons.success, tone: MarkTone.success),
  MakeupStatus.waived => (label: 'Чөлөөлсөн', icon: AppIcons.circleSlash, tone: MarkTone.neutral),
};

AttendanceStatus _reasonStatus(MakeupReason r) => switch (r) {
  MakeupReason.absent => AttendanceStatus.absent,
  MakeupReason.excused => AttendanceStatus.excused,
  MakeupReason.late => AttendanceStatus.late,
};

/// `/app/makeup` — бүтэн дэлгэц (вэбийн `/app/makeup`).
class MakeupScreen extends StatelessWidget {
  const MakeupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Нөхөх хичээл')),
      body: const MakeupView(),
    );
  }
}

/// «Нөхөх» таб ба `/app/makeup`: нөхөх шаардлагатай өдрүүд (тест + тэмдэглэлийн зураг),
/// доор нь нөхсөн/чөлөөлсөн жагсаалт. Үүрэг, төлөвийг СЕРВЕР тооцоолно.
class MakeupView extends ConsumerWidget {
  const MakeupView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final items = ref.watch(myMakeupProvider);
    return RefreshIndicator(
      onRefresh: () => refreshProviders(ref, [myMakeupProvider]),
      child: AsyncBody(
        value: items,
        onRetry: () => ref.invalidate(myMakeupProvider),
        builder: (list) {
          final pending = list.where((i) => i.isOpen).toList();
          final done = list.where((i) => !i.isOpen).toList();
          return ListView(
            padding: const EdgeInsets.all(AppSpace.gutter),
            children: [
              Row(
                children: [
                  Expanded(child: Text('Нөхөх хичээл', style: context.text.titleLarge)),
                  const InfoHint(
                    title: 'Нөхөх хичээл',
                    message:
                        'Тасалсан, чөлөөтэй эсвэл хоцорсон өдрийн онолоо дэвтэртээ бичээд зургийг нь илгээж, '
                        'тэр өдрийн тестийн A, B хувилбарыг шалгалтын горимоор хийнэ. Ангид суусан бол ангид хийсэн '
                        'хувилбар тооцогдоно',
                  ),
                  if (pending.isNotEmpty) InfoPill(label: '${pending.length} үлдсэн'),
                ],
              ),
              const SizedBox(height: AppSpace.md),
              if (pending.isEmpty)
                const EmptyState(
                  icon: AppIcons.success,
                  title: 'Нөхөх хичээл алга',
                  message: 'Хичээл тасалсан, чөлөө авсан эсвэл хоцорсон өдөр энд гарч ирнэ',
                )
              else
                for (final item in pending) ...[MakeupCard(item: item), const SizedBox(height: AppSpace.md)],
              if (done.isNotEmpty) ...[
                const SizedBox(height: AppSpace.md),
                AppCard(
                  padding: EdgeInsets.zero,
                  child: ExpansionTile(
                    shape: const Border(),
                    leading: Icon(AppIcons.success, color: context.colors.success),
                    title: Text('Нөхсөн  ${done.length}'),
                    children: [
                      for (final item in done)
                        ListTile(
                          title: Text(dayTitle(item.date)),
                          subtitle: Text(item.classroomName),
                          trailing: MakeupStatusChip(status: item.status),
                        ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: AppSpace.lg),
              AppCard(
                onTap: () => context.push('/app/theory'),
                child: Row(
                  children: [
                    Icon(AppIcons.images, color: context.colors.brandSoft),
                    const SizedBox(width: AppSpace.md),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Онолын зураг', style: context.text.titleSmall),
                          Text('Өдрөөр, сэдвээр хайх, илгээх', style: context.text.bodySmall),
                        ],
                      ),
                    ),
                    Icon(AppIcons.forward, color: context.colors.inkDim),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Төлөвийн шошго: дүрс + бичиг (өнгө дангаараа биш).
class MakeupStatusChip extends StatelessWidget {
  const MakeupStatusChip({super.key, required this.status});

  final MakeupStatus status;

  @override
  Widget build(BuildContext context) {
    final m = makeupStatusMeta(status);
    final color = m.tone.color(context.colors);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        border: Border.all(color: color),
        borderRadius: BorderRadius.circular(AppRadius.pill),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(m.icon, size: 14, color: color),
          const SizedBox(width: 4),
          Text(
            m.label,
            style: context.text.labelSmall?.copyWith(color: context.colors.ink, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

/// Нэг нөхөх өдөр: алхам (тест бүр + зураг), тест эхлүүлэх, тэмдэглэлийн зураг.
class MakeupCard extends ConsumerStatefulWidget {
  const MakeupCard({super.key, required this.item});

  final MakeupItem item;

  @override
  ConsumerState<MakeupCard> createState() => _MakeupCardState();
}

class _MakeupCardState extends ConsumerState<MakeupCard> {
  String? _busyTest;
  String? _error;

  Future<void> _start(MakeupTest t) async {
    final item = widget.item;
    if (t.open) {
      await context.push('/app/tests/${Uri.encodeComponent(t.testId)}');
      ref.invalidate(myMakeupProvider);
      return;
    }
    setState(() {
      _busyTest = t.testId;
      _error = null;
    });
    try {
      final id = await ref
          .read(myClassRepositoryProvider)
          .openMakeupTest(classroomId: item.classroomId, date: item.date, testId: t.testId);
      if (!mounted) return;
      setState(() => _busyTest = null);
      await context.push('/app/tests/${Uri.encodeComponent(id)}');
      ref.invalidate(myMakeupProvider);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busyTest = null;
          _error = errorMessageOf(e);
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final item = widget.item;
    final c = context.colors;
    final todo = item.tests.where((t) => !t.inClass).toList();
    final steps = todo.length + 1;
    final stepsDone = todo.where((t) => t.done).length + (item.photosAccepted ? 1 : 0);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${dayTitle(item.date)} хичээлээ нөхөх', style: context.text.titleSmall),
                    const SizedBox(height: 2),
                    Meta(
                      items: [
                        item.classroomName,
                        AttendanceMarkView(status: _reasonStatus(item.reason)),
                      ],
                    ),
                  ],
                ),
              ),
              Semantics(
                label: '$steps алхмаас $stepsDone хийсэн',
                excludeSemantics: true,
                child: Text('$stepsDone/$steps', style: context.text.bodySmall),
              ),
              const SizedBox(width: AppSpace.sm),
              MakeupStatusChip(status: item.status),
            ],
          ),
          const Divider(height: AppSpace.xl),
          Row(
            children: [
              Icon(AppIcons.exam, size: 18, color: c.brandSoft),
              const SizedBox(width: AppSpace.sm),
              Text('Тест, шалгалтын горимоор', style: context.text.titleSmall),
            ],
          ),
          if (item.tests.isEmpty)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.xs),
              child: Text('Энэ өдөр анги тест хийгээгүй', style: context.text.bodySmall),
            )
          else
            for (final t in item.tests) _testRow(context, t),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.xs),
              child: Semantics(
                liveRegion: true,
                child: Text(_error!, style: context.text.bodySmall?.copyWith(color: c.error)),
              ),
            ),
          const SizedBox(height: AppSpace.lg),
          Row(
            children: [
              Icon(AppIcons.penLine, size: 18, color: c.brandSoft),
              const SizedBox(width: AppSpace.sm),
              Expanded(child: Text('Онолын тэмдэглэлийн зураг', style: context.text.titleSmall)),
              if (item.photosAccepted)
                Semantics(
                  label: 'Илгээсэн',
                  child: Icon(AppIcons.success, size: 18, color: c.success),
                ),
            ],
          ),
          if (item.resubmit)
            Padding(
              padding: const EdgeInsets.only(top: AppSpace.xs),
              child: Row(
                children: [
                  Icon(AppIcons.restart, size: 16, color: c.warning),
                  const SizedBox(width: AppSpace.xs),
                  Expanded(child: Text('Багш зургаа дахин илгээхийг хүссэн', style: context.text.bodyMedium)),
                ],
              ),
            ),
          const SizedBox(height: AppSpace.sm),
          if (item.imageKeys.isNotEmpty)
            PhotoStrip(keys: item.imageKeys, height: 96, semanticPrefix: 'Тэмдэглэлийн зураг')
          else
            Text('Зураг хараахан илгээгээгүй', style: context.text.bodySmall),
          const SizedBox(height: AppSpace.sm),
          OutlinedButton.icon(
            icon: const Icon(AppIcons.camera, size: 18),
            label: Text(item.imageKeys.isEmpty ? 'Дэвтрийн зураг илгээх' : 'Зургаа солих'),
            onPressed: () => context.push('/app/makeup/photos/${Uri.encodeComponent(item.classroomId)}/${item.date}'),
          ),
        ],
      ),
    );
  }

  Widget _testRow(BuildContext context, MakeupTest t) {
    final c = context.colors;
    final label = makeupTestLabel(t.title, t.variant);
    final busy = _busyTest == t.testId;
    Widget? action;
    if (!t.done) {
      if (!t.online) {
        action = Text('Дүнг багш оруулна', style: context.text.bodySmall);
      } else {
        action = OutlinedButton(
          onPressed: busy || _busyTest != null ? null : () => _start(t),
          child: busy
              ? const SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Эхлэх'),
        );
      }
    }
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.sm),
      child: Row(
        children: [
          Semantics(
            label: t.done ? 'Хийсэн' : 'Хийгээгүй',
            child: Icon(t.done ? AppIcons.success : AppIcons.circle, size: 20, color: t.done ? c.success : c.inkDim),
          ),
          const SizedBox(width: AppSpace.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.variant == null ? label.title : '${label.title}  ${label.variant}',
                  style: context.text.bodyMedium?.copyWith(color: t.done ? c.inkDim : c.ink),
                ),
                if (t.inClass) Text('Ангид хийсэн тул тооцогдсон', style: context.text.bodySmall),
              ],
            ),
          ),
          ?action,
        ],
      ),
    );
  }
}
