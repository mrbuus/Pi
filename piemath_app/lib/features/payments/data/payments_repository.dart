import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'ledger.dart';
import 'payment_record.dart';

class PaymentsRepository {
  const PaymentsRepository(this._api);

  final ApiClient _api;

  /// `GET /payments/ledger/overview` — ангиудын товч (ADMIN, Багш+).
  Future<LedgerOverview> ledgerOverview() => _api.get('/payments/ledger/overview', parse: LedgerOverview.fromJson);

  /// `GET /payments/ledger/board?classroomId=` — ангийн сурагч бүрийн сарын төлөв.
  Future<LedgerBoard> ledgerBoard(String classroomId) =>
      _api.get('/payments/ledger/board', query: {'classroomId': classroomId}, parse: LedgerBoard.fromJson);

  /// `GET /payments/ledger/student/:id` — нэг сурагчийн ledger (үнэ серверээс).
  Future<StudentLedger> ledgerStudent(String studentId) =>
      _api.get('/payments/ledger/student/${Uri.encodeComponent(studentId)}', parse: StudentLedger.fromJson);

  /// `POST /payments/ledger/student/:id/extensions` — сар бүрийн төлбөрийн хугацааг сунгана (тэр сар ба
  /// дараагийн бүх сар шилжинэ). Шалтгаан заавал. Хүсэлт автоматаар давтагдахгүй.
  Future<void> extend(String studentId, {required String month, required int days, required String reason}) =>
      _api.post<Object?>(
        '/payments/ledger/student/${Uri.encodeComponent(studentId)}/extensions',
        body: {'month': month, 'days': days, 'reason': reason},
      );

  /// `DELETE /payments/ledger/student/:id/extensions/:extId` — сунгалтыг цуцлах. Сервер зөөлөн цуцалдаг
  /// (`deletedAt`, аудиттай) — мөр устахгүй.
  Future<void> cancelExtension(String studentId, String extensionId) => _api.delete<Object?>(
    '/payments/ledger/student/${Uri.encodeComponent(studentId)}/extensions/${Uri.encodeComponent(extensionId)}',
  );

  /// `PATCH /users/:id/profile` — багц, дүн, сууж эхэлсэн өдөр (Админ, Багш+).
  ///
  /// [agreed]: тохирсон (хөнгөлөлттэй) бүтэн жилийн дүн. `null` бол стандарт үнэ, [sendAgreed] `false` бол
  /// талбарыг огт илгээхгүй (өмнө тавьсныг хэвээр үлдээнэ). Ledger өөрчлөгдөх тул `/payments` кэшийг цэвэрлэнэ.
  Future<void> updatePlan(
    String studentId, {
    required PlanKind kind,
    int? amount,
    int? agreed,
    bool sendAgreed = true,
    String? joinedOn,
  }) async {
    await _api.patch<Object?>(
      '/users/${Uri.encodeComponent(studentId)}/profile',
      body: {
        'tuitionPlan': kind.api,
        'tuitionAmount': ?amount,
        if (sendAgreed) 'tuitionAgreed': agreed,
        'joinedOn': ?joinedOn,
      },
    );
    _api.invalidateCache('/payments');
  }

  /// `GET /payments/my` — өөрийн төлбөрүүд, `createdAt` буурах.
  Future<List<PaymentRecord>> myPayments() => _api.get(
    '/payments/my',
    parse: (j) => [for (final e in j! as List) PaymentRecord.fromJson((e as Map).cast<String, Object?>())],
  );
}

final paymentsRepositoryProvider = Provider<PaymentsRepository>(
  (ref) => PaymentsRepository(ref.watch(apiClientProvider)),
);

final myPaymentsProvider = FutureProvider.autoDispose<List<PaymentRecord>>(
  (ref) => ref.watch(paymentsRepositoryProvider).myPayments(),
);

final ledgerOverviewProvider = FutureProvider.autoDispose<LedgerOverview>(
  (ref) => ref.watch(paymentsRepositoryProvider).ledgerOverview(),
);

final ledgerBoardProvider = FutureProvider.autoDispose.family<LedgerBoard, String>(
  (ref, id) => ref.watch(paymentsRepositoryProvider).ledgerBoard(id),
);

final ledgerStudentProvider = FutureProvider.autoDispose.family<StudentLedger, String>(
  (ref, id) => ref.watch(paymentsRepositoryProvider).ledgerStudent(id),
);
