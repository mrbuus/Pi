import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../teacher/ui/lesson_extras.dart' show DismissalCard;
import '../application/classrooms_admin_providers.dart';
import '../data/classrooms_admin_models.dart';
import '../data/classrooms_admin_repository.dart';
import 'classroom_sheets.dart';

/// Анги тарах ойролцоо цаг (`/app/dismissal`, вэбийн `app/dismissal/page.tsx`). Анги, өдөр сонгоод багшийн
/// самбарын [DismissalCard]-аар (`/learning-lab/classrooms/:id/dismissal`) тэмдэглэнэ — давхар маягтгүй.
/// Ангиуд: Админ бүгд, Багш+ ба Багш өөрийн ангийн багш болсон анги (вэбтэй ижил).
class DismissalScreen extends ConsumerStatefulWidget {
  const DismissalScreen({super.key});

  @override
  ConsumerState<DismissalScreen> createState() => _DismissalScreenState();
}

class _DismissalScreenState extends ConsumerState<DismissalScreen> {
  String? _classId;
  UbDateTime? _day;

  Future<void> _pickClass(List<AdminClassroom> classes, AdminClassroom selected) async {
    final picked = await showSelectSheet<String>(
      context,
      title: 'Анги',
      selected: selected.id,
      options: [for (final c in classes) SelectOption(c.id, c.name, subtitle: c.gradeLabel, icon: AppIcons.myClass)],
    );
    if (picked != null && mounted) setState(() => _classId = picked.value);
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(classroomsAccessProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Анги тарах цаг')),
      body: !access.canOpenDismissal
          ? const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden)
          : ref
                .watch(adminClassroomsProvider)
                .when(
                  skipLoadingOnRefresh: true,
                  loading: () => const LoadingState(cards: 2),
                  error: (e, _) => ErrorState(
                    message: errorMessage(e, 'Ангийн мэдээлэл нээгдсэнгүй'),
                    onRetry: () => ref.invalidate(adminClassroomsProvider),
                  ),
                  data: (all) => _body(context, access.dismissalClasses(all)..sort(compareClassrooms)),
                ),
    );
  }

  Widget _body(BuildContext context, List<AdminClassroom> classes) {
    if (classes.isEmpty) {
      return const EmptyState(
        icon: AppIcons.myClass,
        title: 'Танд харьяалагдсан идэвхтэй анги алга',
        message: 'Ангийн багшаар оноогдсон үед энд гарна',
      );
    }
    final c = context.colors;
    final today = ref.watch(classroomsTodayProvider);
    final day = _day ?? today;
    final selected = classes.firstWhere((r) => r.id == _classId, orElse: () => classes.first);
    return RefreshIndicator(
      onRefresh: () => ref.refresh(adminClassroomsProvider.future).then((_) {}, onError: (_) {}),
      child: CustomScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        slivers: [
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.sm),
            sliver: SliverToBoxAdapter(
              child: AppCard(
                key: const ValueKey('dismissal-class'),
                onTap: classes.length > 1 ? () => _pickClass(classes, selected) : null,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                  child: ItemRow(
                    leading: Icon(AppIcons.myClass, color: c.brand),
                    title: selected.name,
                    meta: [selected.kind.label, ?selected.gradeLabel],
                    chevron: classes.length > 1,
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: WeekStrip(selected: day, today: today, onSelected: (d) => setState(() => _day = d)),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.sm),
            sliver: SliverToBoxAdapter(
              child: DismissalCard(
                key: ValueKey('dismissal-${selected.id}-${day.dateKey}'),
                classId: selected.id,
                date: day.dateKey,
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
            sliver: SliverToBoxAdapter(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(AppIcons.info, size: 18, color: c.inkDim),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(
                    child: Text(
                      'Багшийн гаргасан ангийн мэдээлэл. Тайлбар нь сурагч, эцэг эхэд харагдана',
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
