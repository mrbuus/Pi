import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'finance_models.dart';

/// Санхүүгийн тайлан, зарлага (`/finance/*`). Сервер: ADMIN, TEACHER_PLUS + `finance.manage`;
/// вэбийн хуудас зөвхөн Админд (`admin/finance/layout.tsx`) — апп ч мөн адил.
///
/// Зарлага устгах `DELETE /finance/expenses/:id` нь ХАТУУ устгал (`expenseRecord.delete`) тул
/// апп энэ үйлдлийг ОГТ харуулахгүй (прод өгөгдөл устгахгүй дүрэм) — API зөөлөн устгал болтол.
class FinanceRepository {
  FinanceRepository(this._api);

  final ApiClient _api;

  Future<FinanceReport> report(YearMonth month) =>
      _api.get('/finance/report', query: {'month': month.key}, parse: FinanceReport.fromJson);

  Future<List<ExpenseRecord>> expenses(YearMonth month) => _api.get(
    '/finance/expenses',
    query: {'month': month.key},
    parse: (j) => [for (final e in (j as List?) ?? const []) ExpenseRecord.fromJson(e)],
  );

  /// Шинэ зарлага. Хүсэлт ХЭЗЭЭ Ч автоматаар давтагдахгүй (`retry: false`).
  Future<void> createExpense(ExpenseDraft draft) => _api.post<Object?>('/finance/expenses', body: draft.toJson());

  /// Зарлага засах (бүх талбарыг илгээнэ — вэбтэй ижил).
  Future<void> updateExpense(String id, ExpenseDraft draft) =>
      _api.patch<Object?>('/finance/expenses/${Uri.encodeComponent(id)}', body: draft.toJson());
}

final financeRepositoryProvider = Provider<FinanceRepository>((ref) => FinanceRepository(ref.watch(apiClientProvider)));
