import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/group_detail_screen.dart';
import 'ui/groups_screen.dart';

/// `groups` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/groups` — гадны багш (`GROUP_TEACHER` цэсийн нүүр): өөрийн бүлгүүд, үүсгэх; сурагч, худалдан авагч:
///   кодоор нэгдэх.
/// - `/app/groups/:groupId` — бүлгийн дэлгэрэнгүй: нэгдэх код, сурагчид, дүн, хасах, архивлах.
final groupsRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: GroupsScreen.path,
      builder: (_, _) => const GroupsScreen(),
      routes: [
        GoRoute(
          path: ':groupId',
          builder: (_, s) => GroupDetailScreen(groupId: s.pathParameters['groupId'] ?? ''),
        ),
      ],
    ),
  ],
);
