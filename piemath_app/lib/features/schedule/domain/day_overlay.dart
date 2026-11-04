import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/native/native.dart';
import '../data/staff_schedule_models.dart';
import '../data/staff_schedule_repository.dart';

/// Түлхүүр: `YYYY-MM-DD|scheduleId`.
String lessonKey(String date, String scheduleId) => '$date|$scheduleId';

/// Серверийн хариу ирэхээс өмнө дэлгэцэд шууд харагдах өөрчлөлт:
/// - [hidden]: «Буцаах» хугацаанд нуусан хичээл (цуцлах, устгах);
/// - [staff]: optimistic ахлах/туслах багш.
class DayOverlayState {
  const DayOverlayState({this.hidden = const {}, this.staff = const {}});

  final Set<String> hidden;
  final Map<String, ({StaffRef? lead, StaffRef? assistant})> staff;

  bool get isEmpty => hidden.isEmpty && staff.isEmpty;

  DayPlan apply(DayPlan plan) {
    if (isEmpty) return plan;
    return plan.withLessons([
      for (final l in plan.lessons)
        if (!hidden.contains(lessonKey(plan.date, l.scheduleId)))
          switch (staff[lessonKey(plan.date, l.scheduleId)]) {
            final p? => l.withStaff(lead: p.lead, assistant: p.assistant),
            null => l,
          },
    ]);
  }

  DayOverlayState copyWith({Set<String>? hidden, Map<String, ({StaffRef? lead, StaffRef? assistant})>? staff}) =>
      DayOverlayState(hidden: hidden ?? this.hidden, staff: staff ?? this.staff);
}

class DayOverlay extends Notifier<DayOverlayState> with OptimisticNotifier<DayOverlayState> {
  @override
  DayOverlayState build() => const DayOverlayState();

  void hide(String key) => state = state.copyWith(hidden: {...state.hidden, key});

  void unhide(String key) => state = state.copyWith(hidden: {...state.hidden}..remove(key));

  void clearStaff(String key) => state = state.copyWith(staff: {...state.staff}..remove(key));

  /// Ахлах/туслах багшийг шууд харуулж, [commit] амжилтгүй бол буцаана.
  Future<MutationResult<void>> patchStaff(
    String key, {
    required StaffRef? lead,
    required StaffRef? assistant,
    required Future<void> Function() commit,
  }) => mutate<void>(
    apply: (s) => s.copyWith(staff: {...s.staff, key: (lead: lead, assistant: assistant)}),
    commit: commit,
    revert: (s) => s.copyWith(staff: {...s.staff}..remove(key)),
  );
}

final dayOverlayProvider = NotifierProvider<DayOverlay, DayOverlayState>(DayOverlay.new);

/// Өдрийн хуваарь + optimistic давхарга.
final visibleDayPlanProvider = Provider.family<AsyncValue<DayPlan>, String>((ref, date) {
  final plan = ref.watch(dayPlanProvider(date));
  final overlay = ref.watch(dayOverlayProvider);
  return plan.whenData(overlay.apply);
});
