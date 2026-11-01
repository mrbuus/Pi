import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/scan/domain/lock_message.dart';
import 'package:piemath_app/features/scan/domain/scan_code.dart';

void main() {
  group('normalizeScanCode (серверийн normalizeScanCode-той ижил)', () {
    test('том үсэг, зай/зураас хасна, O→0, I/L→1', () {
      expect(normalizeScanCode('ab12cd34'), 'AB12CD34');
      expect(normalizeScanCode(' AB12-CD34 '), 'AB12CD34');
      expect(normalizeScanCode('AB12 CD34'), 'AB12CD34');
      expect(normalizeScanCode('OOOOOOOO'), '00000000');
      expect(normalizeScanCode('IL234567'), '11234567');
    });

    test('U байхгүй, урт буруу бол null', () {
      expect(normalizeScanCode('UB12CD34'), isNull);
      expect(normalizeScanCode('AB12CD3'), isNull);
      expect(normalizeScanCode('AB12CD345'), isNull);
      expect(normalizeScanCode(''), isNull);
      expect(normalizeScanCode('A' * 41), isNull);
    });

    test('isScanCode', () {
      expect(isScanCode('AB12CD34'), isTrue);
      expect(isScanCode('ab12cd34'), isFalse);
    });
  });

  group('extractScanCode — зөвхөн номын QR', () {
    test('хүлээн авах хэлбэрүүд', () {
      expect(extractScanCode('https://pimath.mn/q/AB12CD34'), 'AB12CD34');
      expect(extractScanCode('https://pimath.mn/q/ab12cd34/'), 'AB12CD34');
      expect(extractScanCode('http://www.pimath.mn/q/AB12CD34'), 'AB12CD34');
      expect(extractScanCode('pimath.mn/q/AB12CD34'), 'AB12CD34');
      expect(extractScanCode('AB12CD34'), 'AB12CD34');
      expect(extractScanCode('  ab12-cd34 '), 'AB12CD34');
    });

    test('өөр хаяг, зам, параметр — татгалзана (дур мэдэн нээхгүй)', () {
      expect(extractScanCode('https://evil.mn/q/AB12CD34'), isNull);
      expect(extractScanCode('https://pimath.mn.evil.com/q/AB12CD34'), isNull);
      expect(extractScanCode('https://pimath.mn/x/AB12CD34'), isNull);
      expect(extractScanCode('https://pimath.mn/q/AB12CD34?next=//evil'), isNull);
      expect(extractScanCode('https://pimath.mn/q/AB12CD34#x'), isNull);
      expect(extractScanCode('https://user@pimath.mn/q/AB12CD34'), isNull);
      expect(extractScanCode('https://pimath.mn:8443/q/AB12CD34'), isNull);
      expect(extractScanCode('javascript:alert(1)'), isNull);
      expect(extractScanCode('ftp://pimath.mn/q/AB12CD34'), isNull);
      expect(extractScanCode('https://pimath.mn/q/AB12CD34/extra'), isNull);
      expect(extractScanCode('WIFI:S:home;T:WPA;P:secret;;'), isNull);
      expect(extractScanCode(null), isNull);
      expect(extractScanCode(''), isNull);
    });
  });

  group('ScanDebouncer', () {
    test('нэг кодыг 3 секундэд нэг л удаа', () {
      var now = DateTime.utc(2026, 11, 1, 10);
      final d = ScanDebouncer(clock: () => now);
      expect(d.accept('AB12CD34'), isTrue);
      expect(d.accept('AB12CD34'), isFalse);
      now = now.add(const Duration(seconds: 2));
      expect(d.accept('AB12CD34'), isFalse);
      expect(d.accept('ZZ12CD34'), isTrue);
      now = now.add(const Duration(seconds: 4));
      expect(d.accept('ZZ12CD34'), isTrue);
    });
  });

  group('lockMessage (вэбийн lockMessage.ts-тэй ижил бичвэр)', () {
    test('шалтгаан бүр', () {
      expect(ScanLockReason.fromApi('NOT_TAKEN'), ScanLockReason.notTaken);
      expect(ScanLockReason.fromApi('X'), isNull);
      expect(lockMessage(ScanLockReason.notTaken, null).title, 'Эхлээд өөрөө бодоод үзээрэй');
      expect(lockMessage(ScanLockReason.notInTest, null).body,
          'Энэ бодлого одоогоор шалгалтад ороогүй тул бодолтыг харах боломжгүй.');
      expect(lockMessage(ScanLockReason.noSolution, null).title, 'Бодолт бэлтгэгдэж байна');
      expect(lockMessage(ScanLockReason.waiting, null).body, 'Шалгалтаа өгсөн байна. Багш нээсний дараа бодолт харагдана.');
    });

    test('WAITING: UB цагаар нээгдэх огноо', () {
      // UTC 07:00 = UB 15:00
      final m = lockMessage(ScanLockReason.waiting, DateTime.utc(2026, 11, 2, 7));
      expect(m.title, 'Бодолт удахгүй нээгдэнэ');
      expect(m.body, 'Шалгалтаа өгсөн байна. Бодолт 2026.11.02 15:00-д нээгдэнэ.');
    });
  });
}
