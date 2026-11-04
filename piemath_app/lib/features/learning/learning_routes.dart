import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'data/json.dart' show isSafeId;
import 'ui/activity_screen.dart';
import 'ui/chapter_problems_screen.dart';
import 'ui/formula_detail_screen.dart';
import 'ui/formula_review_screen.dart';
import 'ui/formulas_screen.dart';
import 'ui/goals_screen.dart';
import 'ui/learn_screens.dart';
import 'ui/mistakes_screen.dart';
import 'ui/mistakes_today_screen.dart';
import 'ui/practice_screens.dart';
import 'ui/problem_review_screen.dart';
import 'ui/readiness_screen.dart';
import 'ui/review_history_screen.dart';
import 'ui/review_screen.dart';
import 'ui/study_hub_screen.dart';

/// `learning` feature-ийн маршрутууд. Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// shell: алдааны дэвтэр, суралцах нүүр, давтлага (+түүх, хугацаатай давталт), дасгал, томьёоны сан, хичээл, ном (+бүлгийн бодлого), онлайн хичээл,
/// зорилго, бэлэн байдал, идэвх.
final learningRoutes = FeatureRoutes(
  shell: [
    GoRoute(path: '/app/mistakes', builder: (context, state) => const MistakesScreen()),
    GoRoute(path: '/app/mistakes/today', builder: (context, state) => const MistakesTodayScreen()),
    GoRoute(path: '/app/study', builder: (context, state) => const StudyHubScreen()),
    GoRoute(
      path: '/app/study/review',
      builder: (context, state) => ReviewScreen(runId: state.uri.queryParameters['run']),
    ),
    GoRoute(path: '/app/study/history', builder: (context, state) => const ReviewHistoryScreen()),
    GoRoute(
      path: '/app/practice',
      builder: (context, state) => PracticeScreen(
        chapters: _chapters(state.uri.queryParameters['chapter']),
        title: state.uri.queryParameters['title'],
      ),
    ),
    GoRoute(
      path: '/app/practice/:problemId',
      builder: (context, state) => PracticeProblemScreen(
        problemId: state.pathParameters['problemId']!,
        chapters: _chapters(state.uri.queryParameters['chapter']),
      ),
    ),
    GoRoute(path: '/app/study/due', builder: (context, state) => const ProblemReviewScreen()),
    GoRoute(path: '/app/formulas', builder: (context, state) => const FormulasScreen()),
    // `:slug`-аас ӨМНӨ: «review» нь томьёоны slug биш.
    GoRoute(path: '/app/formulas/review', builder: (context, state) => const FormulaReviewScreen()),
    GoRoute(
      path: '/app/formulas/:slug',
      builder: (context, state) => FormulaDetailScreen(slug: state.pathParameters['slug']!),
    ),
    GoRoute(path: '/app/learn', builder: (context, state) => const LearnScreen()),
    GoRoute(
      path: '/app/learn/:chapterId',
      builder: (context, state) => LessonScreen(chapterId: state.pathParameters['chapterId']!),
    ),
    GoRoute(path: '/app/library', builder: (context, state) => const LibraryScreen()),
    GoRoute(
      path: '/app/library/:chapterId/problems',
      builder: (context, state) => ChapterProblemsScreen(chapterId: state.pathParameters['chapterId']!),
    ),
    GoRoute(path: '/app/goals', builder: (context, state) => const GoalsScreen()),
    GoRoute(path: '/app/readiness', builder: (context, state) => const ReadinessScreen()),
    GoRoute(path: '/app/activity', builder: (context, state) => const ActivityScreen()),
    GoRoute(path: '/app/videos', builder: (context, state) => const VideosScreen()),
    GoRoute(
      path: '/app/videos/:chapterId',
      builder: (context, state) => ChapterVideosScreen(chapterId: state.pathParameters['chapterId']!),
    ),
  ],
);

/// Deep link-ээс ирж болох тул зөвхөн аюулгүй ID-уудыг үлдээнэ (12 хүртэл).
String? _chapters(String? raw) {
  if (raw == null) return null;
  final ids = raw.split(',').map((s) => s.trim()).where(isSafeId).take(12).toList();
  return ids.isEmpty ? null : ids.join(',');
}
