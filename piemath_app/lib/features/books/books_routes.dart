import 'package:go_router/go_router.dart';

import '../../app/feature_routes.dart';
import 'ui/book_detail_screen.dart';
import 'ui/books_screen.dart';
import 'ui/placement_screen.dart';
import 'ui/sorils_screen.dart';
import 'ui/try_test_screen.dart';

/// `books` feature-ийн маршрутууд (нэвтрэлтгүй). Энэ файлыг ЗӨВХӨН энэ feature-ийн эзэн засна.
///
/// - `/books` каталог, `/books/:code` ном (сэдвүүд), `/books/:code/topic/:i` сэдвийн тестүүд,
///   `/books/:code/try/:testId` үнэгүй тест бодох.
/// - `/sorils` жишиг сорил (апп доторх бүртгэл, `/app/tests/:id`-ээр өгнө), `/placement` түвшин тогтоох
///   шалгалт (апп дотор бүтэн урсгал: маягт, цагтай тест, бодолтын зураг, илгээх).
final booksRoutes = FeatureRoutes(
  public: [
    GoRoute(path: '/books', builder: (_, _) => const BooksScreen()),
    GoRoute(
      path: '/books/:code',
      builder: (_, s) => BookDetailScreen(code: s.pathParameters['code'] ?? ''),
      routes: [
        GoRoute(
          path: 'topic/:index',
          builder: (_, s) => BookTopicScreen(
            code: s.pathParameters['code'] ?? '',
            index: int.tryParse(s.pathParameters['index'] ?? '') ?? -1,
          ),
        ),
        GoRoute(
          path: 'try/:testId',
          builder: (_, s) => TryTestScreen(code: s.pathParameters['code'] ?? '', testId: s.pathParameters['testId'] ?? ''),
        ),
      ],
    ),
    GoRoute(path: '/sorils', builder: (_, _) => const SorilsScreen()),
    GoRoute(path: '/placement', builder: (_, _) => const PlacementScreen()),
  ],
);
