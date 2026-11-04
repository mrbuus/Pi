import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';
import '../application/staff_providers.dart';
import 'teacher_widgets.dart';

/// Анхаарах сурагчид (Багш+, Админ; вэбийн `AttentionBanner`): ангид хуваарилагдаагүй эсвэл хичээлдээ ирэхгүй
/// байгаа хүүхэд. Эрхгүй, алдаа, хоосон үед өөрөө нуугдана. «Анги оноох» сурагчдын удирдлага руу.
class AttentionStudentsBanner extends ConsumerStatefulWidget {
  const AttentionStudentsBanner({super.key});

  @override
  ConsumerState<AttentionStudentsBanner> createState() => _AttentionStudentsBannerState();
}

class _AttentionStudentsBannerState extends ConsumerState<AttentionStudentsBanner> {
  bool _open = false;
  static const _rows = 6;

  @override
  Widget build(BuildContext context) {
    final data = ref.watch(attentionStudentsProvider).value;
    if (data == null || data.isEmpty) return const SizedBox.shrink();
    final c = context.colors;
    final nU = data.unassigned.length;
    final nA = data.notAttending.length;
    return Padding(
      padding: const EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.sm),
      child: AppCard(
        padding: EdgeInsets.zero,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              button: true,
              expanded: _open,
              child: InkWell(
                borderRadius: BorderRadius.circular(AppRadius.md),
                onTap: () => setState(() => _open = !_open),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: teacherTap),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
                    child: Row(
                      children: [
                        Icon(AppIcons.warning, color: c.error),
                        const SizedBox(width: AppSpace.md),
                        Expanded(
                          child: Meta(
                            style: context.text.titleSmall,
                            items: [
                              if (nU > 0) '$nU хүүхэд ангид хуваарилагдаагүй',
                              if (nA > 0) '$nA хүүхэд хичээлдээ ирэхгүй байна',
                            ],
                          ),
                        ),
                        Icon(_open ? AppIcons.expand : AppIcons.forward, color: c.inkDim),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            if (_open)
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.lg, 0, AppSpace.lg, AppSpace.md),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    for (final u in data.unassigned.take(_rows)) _Row(name: u.name, detail: ['ангид хуваарилагдаагүй', u.code]),
                    if (nU > _rows) Text('ба өөр ${nU - _rows} хүүхэд', style: context.text.bodySmall),
                    for (final a in data.notAttending.take(_rows))
                      _Row(
                        name: a.name,
                        detail: [a.classroomName, '${a.missedCount} удаа ирээгүй', if (a.lastAttended != null) 'сүүлд ${a.lastAttended}'],
                      ),
                    if (nA > _rows) Text('ба өөр ${nA - _rows} хүүхэд', style: context.text.bodySmall),
                    const SizedBox(height: AppSpace.xs),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        // Анги оноох апп дотор — сурагчдын удирдлага (вэб рүү заахгүй, эзэн 2026-11-04)
                        onPressed: () => context.push('/app/admin/students'),
                        icon: const Icon(AppIcons.forward, size: 16),
                        label: const Text('Анги оноох'),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.name, required this.detail});

  final String name;
  final List<Object?> detail;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(name, style: context.text.titleSmall),
        Meta(style: context.text.bodySmall?.copyWith(color: context.colors.inkDim), items: detail),
      ],
    ),
  );
}
