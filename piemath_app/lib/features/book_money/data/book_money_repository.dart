import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/cache/keep_alive.dart';
import '../../../core/cache/swr.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'book_money_models.dart';

String _enc(String v) => Uri.encodeComponent(v);

/// `api/src/book-payments` (Админ, Багш+, Багш — төвийн багш бүр). Ангийн номын чек нээх, тэмдэглэх нь
/// `teacher/data/class_checks.dart`-д (вэбийн `ClassChecksPanel`-тай адил нэг урсгал).
///
/// Мөр хэзээ ч устахгүй: «Арилгах» (`status: NONE`) нь идэвхтэй мөрийг `voidedAt`-аар хаана.
class BookMoneyRepository {
  const BookMoneyRepository(this._api);

  final ApiClient _api;

  static const _base = '/book-payments';

  Future<BookDashboard> dashboard() => _api.get('$_base/dashboard', parse: BookDashboard.fromJson);

  Future<StudentBooks> studentBooks(String studentId) =>
      _api.get('$_base/students/${_enc(studentId)}', parse: StudentBooks.fromJson);

  Future<BookCollectors> collectors() => _api.get('$_base/collectors', parse: BookCollectors.fromJson);

  /// Сурагчийн хуудаснаас тэмдэглэх/засах/болиулах. Буцаах нь шинэ идэвхтэй мөр (`NONE` бол `null`).
  Future<BookPayment?> set(String studentId, String bookKey, BookMarkInput input) => _api.put(
    '$_base/students/${_enc(studentId)}/books/${_enc(bookKey)}',
    body: input.toJson(),
    parse: (j) => j is Map ? BookPayment.fromJson(j) : null,
  );
}

final bookMoneyRepositoryProvider = Provider<BookMoneyRepository>(
  (ref) => BookMoneyRepository(ref.watch(apiClientProvider)),
);

/// «Номын мөнгө» самбар — кэшээс шууд, дараа нь шинэ.
final bookDashboardProvider = FutureProvider.autoDispose<BookDashboard>((ref) {
  ref.cacheFor(const Duration(minutes: 5));
  return swr(ref, () => ref.watch(bookMoneyRepositoryProvider).dashboard());
});

/// Сурагчийн «Ном» таб.
final studentBooksProvider = FutureProvider.autoDispose.family<StudentBooks, String>((ref, studentId) {
  ref.cacheFor(const Duration(minutes: 2));
  return ref.watch(bookMoneyRepositoryProvider).studentBooks(studentId);
});

/// «Хэн авсан» сонгогчийн багш нар — апп ажиллаж байх хугацаанд нэг л удаа (вэб ч ингэдэг).
final bookCollectorsProvider = FutureProvider<BookCollectors>(
  (ref) => ref.watch(bookMoneyRepositoryProvider).collectors(),
);
