import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/lesson_flow_screen.dart';

/// `/app/lesson-flow/my` → `/app/my-class` (вэбтэй адил): сурагчийн «Хичээл» нэг hub-д нэгдсэн
/// (SURAGCH-V2-GEREE, 2026-10-31). Хуучин холбоос, push эвдрэхгүйн тулд `tab`, `day`, `c`-г хадгална.
String lessonFlowMyRedirect(Uri uri) {
  final q = {
    for (final k in const ['tab', 'day', 'c'])
      if (uri.queryParameters[k] case final v? when v.isNotEmpty) k: v,
  };
  return Uri(path: '/app/my-class', queryParameters: q.isEmpty ? null : q).toString();
}

/// `lesson_flow` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/app/lesson-flow` — хичээлийн өдөр (Админ, Багш+, Багш; бусад role-д «багш нарт» гэсэн хоосон төлөв).
/// - `/app/lesson-flow/my` — сурагч: `/app/my-class` руу шилжинэ (`tab`, `day`, `c` хадгална).
final lessonFlowRoutes = FeatureRoutes(
  shell: [
    GoRoute(
      path: LessonFlowScreen.path,
      builder: (_, _) => const LessonFlowScreen(),
      routes: [GoRoute(path: 'my', redirect: (_, s) => lessonFlowMyRedirect(s.uri))],
    ),
  ],
);
