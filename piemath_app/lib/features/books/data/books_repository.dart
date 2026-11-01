import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/network_providers.dart';
import '../domain/book_meta.dart';
import 'books_models.dart';

/// `GET /catalog/books` (нэвтрэлтгүй, сервер 5 мин кэшлэдэг) — эрэмбэ вэбтэй ижил.
final booksCatalogProvider = FutureProvider<List<BookSummary>>((ref) async {
  final list = await ref.read(apiClientProvider).get(
        '/catalog/books',
        auth: false,
        parse: (j) => [for (final b in (j! as List)) BookSummary.fromJson((b! as Map).cast<String, Object?>())],
      );
  return [...list]..sort((a, b) => bookOrder(a.code).compareTo(bookOrder(b.code)));
});

/// `GET /catalog/books/:code` — 404 «Ном олдсонгүй».
final bookDetailProvider = FutureProvider.family<BookDetail, String>((ref, code) {
  return ref.read(apiClientProvider).get(
        '/catalog/books/${Uri.encodeComponent(code)}',
        auth: false,
        parse: (j) => BookDetail.fromJson((j! as Map).cast<String, Object?>()),
      );
});

/// `GET /catalog/try/tests/:id` — 403 «Энэ тест номын эрхтэй сурагчдад нээлттэй».
final tryTestProvider = FutureProvider.autoDispose.family<TryView, String>((ref, id) {
  return ref.read(apiClientProvider).get(
        '/catalog/try/tests/${Uri.encodeComponent(id)}',
        auth: false,
        parse: (j) => TryView.fromJson((j! as Map).cast<String, Object?>()),
      );
});

/// `GET /catalog/mock-exams` — жишиг сорилын нийтийн мэдээлэл.
final mockExamsProvider = FutureProvider.autoDispose<MockPublic>((ref) {
  return ref.read(apiClientProvider).get(
        '/catalog/mock-exams',
        auth: false,
        parse: (j) => MockPublic.fromJson((j! as Map).cast<String, Object?>()),
      );
});

/// Үнэгүй тестийн дүгнэлт (сервер юу ч хадгалахгүй, зөв хариу илгээхгүй). Давтахад аюулгүй.
Future<TryResult> gradeTryTest(WidgetRef ref, String testId, Map<String, Object> answers) {
  return ref.read(apiClientProvider).post(
        '/catalog/try/tests/${Uri.encodeComponent(testId)}/grade',
        body: {'answers': answers},
        auth: false,
        retry: true,
        parse: (j) => TryResult.fromJson((j! as Map).cast<String, Object?>()),
      );
}

/// Үнэгүй тестийн зураг — нийтийн зам (`/files/:key` БИШ), токенгүй.
ImageProvider tryImage(WidgetRef ref, String testId, String key) => NetworkImage(
      '${ref.read(apiBaseUrlProvider)}/catalog/try/tests/${Uri.encodeComponent(testId)}/files/${Uri.encodeComponent(key)}',
    );
