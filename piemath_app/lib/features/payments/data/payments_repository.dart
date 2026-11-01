import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'payment_record.dart';

class PaymentsRepository {
  const PaymentsRepository(this._api);

  final ApiClient _api;

  /// `GET /payments/my` — өөрийн төлбөрүүд, `createdAt` буурах.
  Future<List<PaymentRecord>> myPayments() => _api.get(
        '/payments/my',
        parse: (j) => [for (final e in j! as List) PaymentRecord.fromJson((e as Map).cast<String, Object?>())],
      );

  /// `GET /assignments/my-classrooms` — төлбөрийн түвшин (ангиар) сонгоход.
  Future<List<MyClassroom>> myClassrooms() => _api.get(
        '/assignments/my-classrooms',
        parse: (j) => [for (final e in j! as List) MyClassroom.fromJson((e as Map).cast<String, Object?>())],
      );
}

final paymentsRepositoryProvider = Provider<PaymentsRepository>(
  (ref) => PaymentsRepository(ref.watch(apiClientProvider)),
);

final myPaymentsProvider = FutureProvider.autoDispose<List<PaymentRecord>>(
  (ref) => ref.watch(paymentsRepositoryProvider).myPayments(),
);

/// Танхимын ангийн сургуулийн анги (9–12) — үнийн түвшинд. Алдаа гарвал null (үнэ харуулахгүй).
final myTuitionGradeProvider = FutureProvider.autoDispose<int?>((ref) async {
  try {
    final rows = await ref.watch(paymentsRepositoryProvider).myClassrooms();
    for (final r in rows) {
      if (r.type == 'IN_PERSON' && r.grade != null) return r.grade;
    }
    return null;
  } catch (_) {
    return null;
  }
});
