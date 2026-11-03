import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'graph/ui/graph_screen.dart';
import 'solve/ui/solve_screen.dart';
import 'ui/plane_screen.dart';
import 'ui/solid_screen.dart';
import 'ui/tools_hub_screen.dart';

/// `tools` (Хэрэглэгдэхүүн) feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: `/app/tools` (жагсаалт). Бүтэн дэлгэц (доод цэсгүй — зураг, гарт илүү зай):
/// `/app/tools/plane` (`?mode=free` — чөлөөт байгуулалт), `/app/tools/solid`, `/app/tools/graph`
/// (`extra`: эхний функцүүд `List<String>`), `/app/tools/solve`. Томьёо нь `/app/formulas` (learning).
final toolsRoutes = FeatureRoutes(
  shell: [GoRoute(path: '/app/tools', builder: (context, state) => const ToolsHubScreen())],
  fullscreen: [
    GoRoute(
      path: '/app/tools/plane',
      builder: (context, state) => PlaneScreen(initialFree: state.uri.queryParameters['mode'] == 'free'),
    ),
    GoRoute(path: '/app/tools/solid', builder: (context, state) => const SolidScreen()),
    GoRoute(
      path: '/app/tools/graph',
      builder: (context, state) {
        final extra = state.extra;
        return extra is List<String> && extra.isNotEmpty ? GraphScreen(initial: extra) : const GraphScreen();
      },
    ),
    GoRoute(path: '/app/tools/solve', builder: (context, state) => const SolveScreen()),
  ],
);
