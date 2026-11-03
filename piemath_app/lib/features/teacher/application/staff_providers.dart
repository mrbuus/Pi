import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../data/class_dashboard_models.dart';
import '../data/staff_models.dart';
import '../data/staff_repository.dart';
import 'teacher_providers.dart';

/// Ангийн жагсаалт (вэбийн «Ангиуд»: `/class-dashboard`).
final classDashboardProvider = FutureProvider.autoDispose<DashList>(
  (ref) => ref.watch(staffRepositoryProvider).classDashboard(),
);

/// Нэг ангийн самбар (`/class-dashboard/classes/:id`).
final classDashboardDetailProvider = FutureProvider.autoDispose.family<DashDetail, String>(
  (ref, id) => ref.watch(staffRepositoryProvider).classDashboardDetail(id),
);

/// Ангийн нөхөх хичээл, сүүлийн 60 хоног (вэбийн `makeupRange`).
final classMakeupProvider = FutureProvider.autoDispose.family<List<MakeupRow>, ({String classId, String today})>((ref, a) {
  final to = a.today;
  final from = shiftDateKey(to, -60);
  return ref.watch(staffRepositoryProvider).makeupRange(a.classId, from: from, to: to);
});

/// Самбарын өдрийн нөхөх хичээлийн төлөв (өнгөрсөн өдөр). Алдаа бол чимээгүй хоосон (вэбтэй ижил).
final dayMakeupProvider = FutureProvider.autoDispose.family<Map<String, MakeupStatus>, ClassDay>((ref, a) async {
  try {
    final rows = await ref.watch(staffRepositoryProvider).makeupBoard(a.classId, a.date);
    return {for (final r in rows) r.studentId: r.status};
  } on ApiError {
    return const {};
  }
});

/// Өмнөх хичээлийн онлайн гэрийн даалгаврын оноо (танхимын анги). Алдаа бол чимээгүй хоосон.
final onlineMarksProvider = FutureProvider.autoDispose.family<OnlineMarks, ClassDay>((ref, a) async {
  try {
    return await ref.watch(staffRepositoryProvider).onlineMarks(a.classId, a.date);
  } on ApiError {
    return const OnlineMarks();
  }
});

final classAttentionProvider = FutureProvider.autoDispose.family<ClassAttention, ClassDay>(
  (ref, a) => ref.watch(staffRepositoryProvider).attention(a.classId, a.date),
);

/// Өдрийн дүгнэлт: 400 = хараахан бодогдоогүй → null.
final dailySummaryProvider = FutureProvider.autoDispose.family<DailySummary?, ClassDay>((ref, a) async {
  try {
    return await ref.watch(staffRepositoryProvider).dailySummary(a.classId, a.date);
  } on ApiError catch (e) {
    if (e.kind == ApiErrorKind.badRequest) return null;
    rethrow;
  }
});

final pendingParentLinksProvider = FutureProvider.autoDispose<List<ParentLinkRequest>>(
  (ref) => ref.watch(staffRepositoryProvider).pendingParentLinks(),
);

/// Багш+/Админы нүүрний анхаарах сурагчид. Эрхгүй/алдаа бол чимээгүй нуугдана (вэбтэй ижил).
final attentionStudentsProvider = FutureProvider.autoDispose<AttentionStudents?>((ref) async {
  if (!ref.watch(canManageProvider)) return null;
  try {
    return await ref.watch(staffRepositoryProvider).attentionStudents();
  } on ApiError {
    return null;
  }
});

final pendingStudentsProvider = FutureProvider.autoDispose<List<PendingStudent>>(
  (ref) => ref.watch(staffRepositoryProvider).pendingStudents(),
);

final pendingPaymentsProvider = FutureProvider.autoDispose<List<PendingPayment>>(
  (ref) => ref.watch(staffRepositoryProvider).pendingPayments(),
);

final leadsProvider = FutureProvider.autoDispose<List<Lead>>((ref) => ref.watch(staffRepositoryProvider).leads());

final announcementsProvider = FutureProvider.autoDispose<List<AnnouncementItem>>(
  (ref) => ref.watch(staffRepositoryProvider).announcements(),
);

/// `YYYY-MM-DD` өдрийг [days]-аар шилжүүлнэ (цагийн бүсгүй хуанлийн арифметик).
String shiftDateKey(String key, int days) {
  final p = key.split('-').map(int.parse).toList();
  final d = DateTime.utc(p[0], p[1], p[2]).add(Duration(days: days));
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${two(d.month)}-${two(d.day)}';
}
