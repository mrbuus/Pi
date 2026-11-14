import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import '../../core/auth/session.dart';
import '../../core/auth/user_role.dart';
import 'ui/paper_board_screen.dart';
import 'ui/paper_exams_list_screen.dart';
import 'ui/student_paper_detail_screen.dart';

/// `paper_exams` feature-ийн маршрут. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/paper-exams` — ажилтны «Нэгдсэн шалгалт» жагсаалт (сурагч → `/app/tests?tab=paper`, вэбтэй ижил).
/// - `/app/paper-exams/:id` — ажилтан: багийн хүснэгт, тойм, дүн оруулах (`?tab=import|overview`);
///   сурагч: өөрийн дүн.
final paperExamsRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: PaperExamsListScreen.path,
      // Зөвхөн жагсаалтын зам — `/:id` (сурагчийн өөрийн дүн) дээр redirect хийхгүй
      redirect: (context, state) =>
          state.uri.path == PaperExamsListScreen.path && _isStudent(context) ? '/app/tests?tab=paper' : null,
      builder: (_, _) => const PaperExamsListScreen(),
      routes: [
        GoRoute(
          path: ':id',
          builder: (context, state) {
            final id = state.pathParameters['id'] ?? '';
            return _isStudent(context)
                ? StudentPaperDetailScreen(id: id)
                : PaperBoardScreen(id: id, initialTab: state.uri.queryParameters['tab']);
          },
        ),
      ],
    ),
  ],
);

bool _isStudent(BuildContext context) {
  final s = ProviderScope.containerOf(context, listen: false).read(sessionProvider);
  return s is SignedIn && s.role == UserRole.student;
}
