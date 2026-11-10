import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/draft_editor_screen.dart';
import 'ui/draft_list_screen.dart';
import 'ui/draft_solve_screen.dart';
import 'ui/word_import_screen.dart';

/// `internal_drafts` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/internal` — бодлогын ноорог (Админ, Багш+).
/// - `/app/internal/:id` — ноорог засах, оруулах, нийтлэх; `/app/internal/:id/solve` — бодож шалгах.
/// - `/app/import` — Word файлаас нэг бодлого бүлэгт (Админ, Багш+).
final internalDraftsRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: DraftListScreen.path,
      builder: (_, _) => const DraftListScreen(),
      routes: [
        GoRoute(
          path: ':id',
          builder: (_, s) => DraftEditorScreen(id: s.pathParameters['id'] ?? ''),
          routes: [
            GoRoute(
              path: 'solve',
              builder: (_, s) => DraftSolveScreen(id: s.pathParameters['id'] ?? ''),
            ),
          ],
        ),
      ],
    ),
    GoRoute(path: WordImportScreen.path, builder: (_, _) => const WordImportScreen()),
  ],
);
