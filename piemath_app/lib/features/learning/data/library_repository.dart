import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/network_providers.dart';
import 'json.dart';
import 'library_models.dart';

/// `GET /books?subject=` — бүтэцтэй (бүлэг/бодлоготой) номууд л.
final libraryBooksProvider = FutureProvider.autoDispose.family<List<LibraryBook>, LibrarySubject>((ref, subject) {
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(apiClientProvider).get(
        '/books',
        query: {'subject': subject.api},
        parse: (j) => [
          for (final b in asList(j))
            if (LibraryBook.fromJson(b) case final book when book.hasContent) book,
        ],
      );
});

/// `GET /chapters?bookId=` — танхимын сурагчид API зөвхөн ангид нээгдсэн сэдвийг өгнө.
final libraryChaptersProvider = FutureProvider.autoDispose.family<List<LibraryChapter>, String>((ref, bookId) {
  ref.watch(sessionProvider.select((s) => s is SignedIn ? s.auth.userId : null));
  return ref.watch(apiClientProvider).get(
        '/chapters',
        query: {'bookId': bookId},
        parse: (j) => [for (final c in asList(j)) LibraryChapter.fromJson(c)],
      );
});
