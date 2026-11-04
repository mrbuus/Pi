import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/payments/data/payment_record.dart';
import 'package:piemath_app/features/payments/domain/org_info.dart';
import 'package:piemath_app/features/payments/domain/payment_history.dart';

import '../m7_fixtures.dart';

void main() {
  final records = [for (final j in myPayments()) PaymentRecord.fromJson(j)];

  test('дотоод талбаруудыг загварт хадгалахгүй', () {
    expect(records.first.toJson().containsKey('qpayInvoiceId'), isFalse);
  });

  test('нийлбэр: CONFIRMED ба PENDING (REVERSED тооцохгүй)', () {
    final h = PaymentHistory(records);
    expect(h.totalConfirmed, 350000);
    expect(h.totalPending, 350000);
  });

  test('сараар бүлэглэнэ: төлсөн огноо, үгүй бол бүртгэсэн, шинэ нь эхэнд', () {
    final h = PaymentHistory(records);
    expect(h.groups.map((g) => g.$1), ['2026-11', '2026-10']);
    expect(h.groups[1].$2.map((p) => p.id), ['p3', 'p1']);
  });

  test('хоосон', () {
    expect(PaymentHistory(const []).isEmpty, isTrue);
  });

  test('шошго', () {
    expect(paymentMonthLabel('2026-09'), '2026 оны 9-р сар');
    expect(paymentMonthLabel('буруу'), 'буруу');
    expect(isoDateLabel('2026-10-02T03:00:00.000Z'), '2026.10.02');
  });

  test('гүйлгээний утга', () {
    expect(transferNote(firstName: 'Тэмүүлэн', lastName: 'Тестийн', phone: '99000001'), 'Тестийн Тэмүүлэн, 99000001, 2027');
    expect(transferNote(firstName: 'Тэмүүлэн'), 'Тэмүүлэн, 2027');
    expect(transferNote(), 'Хүүхдийн овог нэр, утасны дугаар, 2027');
  });
}
