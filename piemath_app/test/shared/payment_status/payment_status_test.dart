import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/tokens.dart';
import 'package:piemath_app/shared/payment_status/payment_status.dart';

void main() {
  test('formatMnt: мянгатын таслал, ₮', () {
    expect(formatMnt(2500000), '2,500,000₮');
    expect(formatMnt(350000), '350,000₮');
    expect(formatMnt(0), '0₮');
    expect(formatMnt(999), '999₮');
    expect(formatMnt(-1200), '-1,200₮');
  });

  group('PaidUntilView (вэбийн PaidUntilCard)', () {
    final today = UbDateTime(2026, 11, 4, 23, 30);

    test('null бол тооцоогүй', () {
      final v = PaidUntilView.of(null, today: today);
      expect(v.kind, PaidUntilKind.unknown);
      expect(v.dateLabel, isNull);
      expect(v.title, 'Төлбөрийн хугацаа тооцогдоогүй байна');
    });

    test('өнгөрсөн', () {
      final v = PaidUntilView.of('2026-11-01T00:00:00.000Z', today: today);
      expect(v.kind, PaidUntilKind.expired);
      expect(v.title, '3 хоногийн өмнө дууссан');
      expect(v.dateLabel, '2026.11.01');
    });

    test('өнөөдөр ба 7 хоногоос бага', () {
      expect(PaidUntilView.of('2026-11-04T00:00:00.000Z', today: today).title, 'Өнөөдөр дуусна');
      final soon = PaidUntilView.of('2026-11-10T00:00:00.000Z', today: today);
      expect(soon.kind, PaidUntilKind.soon);
      expect(soon.title, '6 хоногийн дараа дуусна');
    });

    test('хангалттай', () {
      final v = PaidUntilView.of('2026-11-30T00:00:00.000Z', today: today);
      expect(v.kind, PaidUntilKind.ok);
      expect(v.title, '26 хоног үлдсэн');
    });

    test('огнооны хэсгийг л уншина (бүсээр гулсахгүй)', () {
      // UTC 20:00 = UB маргааш 04:00 боловч хуанлийн өдөр нь ISO-ийн өдөр (вэб getUTCDate).
      expect(PaidUntilView.of('2026-11-30T20:00:00.000Z', today: today).dateLabel, '2026.11.30');
    });

    test('буруу мөр бол тооцоогүй', () {
      expect(PaidUntilView.of('буруу', today: today).kind, PaidUntilKind.unknown);
    });

    test('төлөв бүрт өнгө ялгаатай, дүрстэй', () {
      const c = AppColors.light;
      expect(PaidUntilView.of('2026-11-01', today: today).tone(c), c.error);
      expect(PaidUntilView.of('2026-11-30', today: today).tone(c), c.success);
    });
  });

  test('PaymentStatus: вэбийн шошго, үл мэдэгдэхийг аюулгүй', () {
    expect(PaymentStatus.fromApi('PENDING').label, 'Хүлээгдэж буй');
    expect(PaymentStatus.fromApi('CONFIRMED').label, 'Баталгаажсан');
    expect(PaymentStatus.fromApi('REJECTED').label, 'Цуцалсан');
    expect(PaymentStatus.fromApi('REVERSED').label, 'Буцаасан');
    expect(PaymentStatus.fromApi('NEW_STATE'), PaymentStatus.unknown);
    expect(PaymentStatus.fromApi(null), PaymentStatus.unknown);
  });

  test('төлбөрийн арга', () {
    expect(paymentMethodLabel('BANK_TRANSFER'), 'Данс');
    expect(paymentMethodLabel('QPAY'), 'QPay');
    expect(paymentMethodLabel('CASH'), 'Бэлэн');
    expect(paymentMethodLabel('OTHER'), isNull);
  });
}
