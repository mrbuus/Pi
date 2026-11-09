import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/time/ub_time.dart';
import '../data/content_models.dart';
import '../data/content_repository.dart';

final contentRepositoryProvider = Provider<ContentRepository>((ref) => ContentRepository(ref.watch(apiClientProvider)));

/// Агуулгын удирдлагын эрх — вэб, серверийн `@Roles`-той ижил (UI нуух; шийдвэр серверт).
///
/// | Үйлдэл | Админ | Багш+ | Багш |
/// |---|---|---|---|
/// | Онол нээх, нэмэх, засах, эрэмбэлэх | тийм | тийм | тийм (засах нь өөрийнхөө) |
/// | Онол архивлах | тийм | тийм | үгүй |
/// | Жишиг сорил, түвшин харах | тийм | тийм | тийм |
/// | Сорил нэмэх, нийтлэх; түвшний агуулга засах | тийм | тийм | үгүй |
/// | Нэвтрэх хуудасны бичиг | тийм | үгүй | үгүй |
class ContentAccess {
  const ContentAccess({this.role, this.userId});

  final UserRole? role;
  final String? userId;

  bool get isAdmin => role == UserRole.admin;
  bool get isPlus => role == UserRole.teacherPlus;
  bool get isStaff => role?.isStaff ?? false;
  bool get canManage => isAdmin || isPlus;

  bool get canOpen => isStaff;
  bool get canArchiveTheory => canManage;
  bool canEditTheory(TheoryItem t) => canManage || (role == UserRole.teacher && t.createdById == userId);
  bool get canEditMocks => canManage;
  bool get canEditPlacementConfig => canManage;
  bool get canEditLoginText => isAdmin;
}

final contentAccessProvider = Provider<ContentAccess>((ref) {
  final s = ref.watch(sessionProvider);
  if (s is! SignedIn) return const ContentAccess();
  return ContentAccess(role: s.role, userId: s.user?.id ?? s.auth.userId);
});

/// «Одоо» (UB) — сорилын анхдагч огноо. Тестэд тогтмол.
final contentNowProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

final theoryBooksProvider = FutureProvider.autoDispose.family<List<ContentBook>, ContentSubject>(
  (ref, s) => ref.watch(contentRepositoryProvider).books(s),
);

final theoryChaptersProvider = FutureProvider.autoDispose.family<List<ContentChapter>, String>(
  (ref, bookId) => ref.watch(contentRepositoryProvider).chapters(bookId),
);

final theoryBlocksProvider = FutureProvider.autoDispose.family<List<TheoryItem>, String>(
  (ref, chapterId) => ref.watch(contentRepositoryProvider).theories(chapterId),
);

final mockEventsProvider = FutureProvider.autoDispose<List<MockEvent>>(
  (ref) => ref.watch(contentRepositoryProvider).mockEvents(),
);

final mockRegistrationsProvider = FutureProvider.autoDispose.family<List<MockRegistration>, String>(
  (ref, id) => ref.watch(contentRepositoryProvider).mockRegistrations(id),
);

final placementsProvider = FutureProvider.autoDispose<List<PlacementAttempt>>(
  (ref) => ref.watch(contentRepositoryProvider).placements(),
);

final placementDetailProvider = FutureProvider.autoDispose.family<PlacementDetail, String>(
  (ref, id) => ref.watch(contentRepositoryProvider).placement(id),
);

final placementConfigProvider = FutureProvider.autoDispose<PlacementConfig>(
  (ref) => ref.watch(contentRepositoryProvider).placementConfig(),
);

final loginTextProvider = FutureProvider.autoDispose<String>((ref) => ref.watch(contentRepositoryProvider).loginText());
