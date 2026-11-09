import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/features/sms/application/sms_send_controller.dart';
import 'package:piemath_app/features/sms/data/sms_models.dart';
import 'package:piemath_app/features/sms/data/sms_repository.dart';
import 'package:piemath_app/features/sms/domain/sms_logic.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'sms_fixtures.dart';

SmsRepository _repo(FakeHttp http) =>
    SmsRepository(ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder(), dio: http.dio()));

Map<String, Object?> _body(FakeHttp http, String method, String path) =>
    (http.requests.lastWhere((r) => r.method == method && r.path == path).data as Map).cast();

void main() {
  group('Эрх', () {
    test('харах нь Админ, Багш+; илгээх, загвар засах нь зөвхөн Админ', () {
      const admin = SmsAccess(UserRole.admin);
      const plus = SmsAccess(UserRole.teacherPlus);
      expect([admin.canView, admin.canSend, admin.canRetry, admin.canManageTemplates], [true, true, true, true]);
      expect([plus.canView, plus.canSend, plus.canRetry, plus.canManageTemplates], [true, false, false, false]);
      for (final r in [UserRole.teacher, UserRole.student, UserRole.parent, null]) {
        expect(SmsAccess(r).canView, isFalse);
        expect(SmsAccess(r).canSend, isFalse);
      }
    });
  });

  group('Хэсгийн тоо (вэбийн segments.ts)', () {
    test('хоосон 0, латин 160 / 153', () {
      expect(previewSmsSegments('').segments, 0);
      final one = previewSmsSegments('a' * 160);
      expect([one.gsm, one.segments, one.encoding], [true, 1, 'GSM-7']);
      expect(previewSmsSegments('a' * 161).segments, 2);
      expect(previewSmsSegments('a' * 306).segments, 2);
      expect(previewSmsSegments('a' * 307).segments, 3);
      expect(previewSmsSegments('a' * 161).multipartLimit, 153);
    });

    test('өргөтгөсөн тэмдэгт 2 нэгж', () {
      expect(previewSmsSegments('[]').units, 4);
      expect(previewSmsSegments('${'a' * 159}€').segments, 2);
    });

    test('кирилл (Ү Ө) UCS-2: 70 / 67', () {
      final p = previewSmsSegments('Өнөөдөр хичээл орно, Үдээс хойш');
      expect([p.gsm, p.encoding, p.singleLimit], [false, 'UCS-2', 70]);
      expect(previewSmsSegments('ө' * 70).segments, 1);
      expect(previewSmsSegments('ө' * 71).segments, 2);
      expect(previewSmsSegments('ө' * 135).segments, 3);
    });
  });

  group('Хүлээн авагч', () {
    test('дугаар задлах: зай, таслал, цэгтэй таслал, мөр; давхардлыг хасахгүй', () {
      expect(parsePhones(' 99112233, 88112233;\n99112233  '), ['99112233', '88112233', '99112233']);
      expect(parsePhones('  '), isEmpty);
    });

    test('ангиас: сонгосон утас, давхардалгүй, зайгүй', () {
      const students = [
        SmsStudentContact(id: 's1', classroomId: 'c1', phone: '9900 0001', fatherPhone: '88000001'),
        SmsStudentContact(id: 's2', classroomId: 'c1', phone: '99000002', motherPhone: '88000001'),
        SmsStudentContact(id: 's3', classroomId: 'c2', phone: '99000003'),
      ];
      expect(classPhones(students, 'c1', {SmsAudience.student}), ['99000001', '99000002']);
      expect(
        classPhones(students, 'c1', {SmsAudience.father, SmsAudience.mother}),
        ['88000001'],
      );
      expect(classPhones(students, 'c3', SmsAudience.values.toSet()), isEmpty);
    });

    test('нэмэхэд байгааг давтахгүй', () {
      expect(appendPhones('99000001', ['99000001', '99000002']), '99000001, 99000002');
      expect(appendPhones('', ['99000003']), '99000003');
    });

    test('загварт нууц үгийн бодит код хадгалахгүй', () {
      expect(templateBodyError('Таны нууц үг сэргээх код: 123456'), isNotNull);
      expect(templateBodyError('Маргааш 10 цагт хичээл орно'), isNull);
    });
  });

  group('Загвар (JSON)', () {
    test('төлөв, төрөл, тооцоо', () {
      final m = SmsMessage.fromJson(smsMessageJson('m1', status: 'FAILED', error: 'x'));
      expect([m.status, m.error, m.segments], [SmsMessageStatus.failed, 'x', 1]);
      expect(m.createdAt, DateTime.utc(2026, 11, 9, 2));
      expect(SmsMessageStatus.fromApi('NOPE'), SmsMessageStatus.unknown);
      final t = SmsTemplate.fromJson(smsTemplatesJson[1]);
      expect([t.locked, t.kindLabel], [true, 'Нууц үг сэргээх']);
      expect(SmsKind.creatable, isNot(contains(SmsKind.passwordReset)));
      final e = SmsEstimate.fromJson(smsEstimateJson);
      expect([e.deduplicatedCount, e.estimatedSegments, e.estimatedCost, e.segmentsPerRecipient], [2, 4, 160, 2]);
      expect(SmsStatus.fromJson(const {'configured': false}).configured, isFalse);
    });
  });

  group('Репозитор', () {
    test('түүх: skip/take, шүүлтүүр, утас', () async {
      final http = smsHttp();
      final page = await _repo(http).messages(status: SmsMessageStatus.failed, phone: ' 8800 ', skip: 20);
      expect(http.requests.last.queryParameters, {'skip': '20', 'take': '20', 'status': 'FAILED', 'phone': '8800'});
      expect(page.total, 2);
      await _repo(http).messages();
      expect(http.requests.last.queryParameters, {'skip': '0', 'take': '20'});
    });

    test('илгээх замууд, бие', () async {
      final http = smsHttp();
      final repo = _repo(http);
      expect((await repo.send(phone: '99000001', text: 'hi')).segments, 1);
      expect(_body(http, 'POST', '/sms/send'), {'phone': '99000001', 'text': 'hi'});
      expect(await repo.createBulk(phones: ['1', '2'], text: 'x'), 'b1');
      expect(_body(http, 'POST', '/sms/bulk'), {
        'phones': ['1', '2'],
        'text': 'x',
      });
      expect((await repo.startBulk('b1')).queued, 2);
      await repo.createTemplate(name: 'n', body: 'b', kind: SmsKind.exam);
      expect(_body(http, 'POST', '/sms/templates'), {'name': 'n', 'body': 'b', 'kind': 'EXAM'});
    });

    test('нэг дугаар руу илгээх сүлжээний алдаанд ДАВТАХГҮЙ', () async {
      final http = FakeHttp()..on('POST', '/sms/send', (_) => const FakeResponse.network());
      await expectLater(_repo(http).send(phone: '99000001', text: 'x'), throwsA(anything));
      expect(http.count('POST', '/sms/send'), 1);
    });

    test('бөөн илгээлтийг эхлүүлэх сүлжээний алдаанд ДАВТАХГҮЙ', () async {
      final http = FakeHttp()..on('POST', '/sms/bulk/b1/start', (_) => const FakeResponse.network());
      await expectLater(_repo(http).startBulk('b1'), throwsA(anything));
      expect(http.count('POST', '/sms/bulk/b1/start'), 1);
    });
  });

  group('Илгээх төлөв', () {
    SmsSendController ctrlOf(FakeHttp http) {
      final c = testContainer(http: http);
      c.listen(smsSendControllerProvider, (_, _) {});
      return c.read(smsSendControllerProvider.notifier);
    }

    test('нэг дугаар: тооцоогүй илгээнэ, баталгаажуулах бичвэрт дугаар, хэсэг', () async {
      final http = smsHttp();
      final ctrl = ctrlOf(http);
      ctrl.setRecipients('99000001');
      ctrl.setText('Сайн байна уу');
      expect(ctrl.state.isBulk, isFalse);
      expect(ctrl.state.canSend, isTrue);
      expect(ctrl.state.confirmText, contains('99000001'));
      expect(ctrl.state.confirmText, contains('1 хэсэг'));
      expect(await ctrl.send(), isTrue);
      expect(ctrl.state.success, 'Мессеж илгээгдлээ, 1 хэсэг');
      expect(ctrl.state.recipients, isEmpty);
      expect(http.count('POST', '/sms/bulk/estimate'), 0);
    });

    test('бөөн: тооцоогүй бол илгээхгүй, оролт солигдвол тооцоо хүчингүй', () async {
      final http = smsHttp();
      final ctrl = ctrlOf(http);
      ctrl.setRecipients('99000001, 99000002, 99000001');
      ctrl.setText('Мэдэгдэл');
      expect(ctrl.state.canSend, isFalse);
      expect(await ctrl.send(), isFalse);
      expect(http.count('POST', '/sms/bulk'), 0);
      await ctrl.fetchEstimate();
      expect(ctrl.state.estimateIsCurrent, isTrue);
      expect(ctrl.state.canSend, isTrue);
      expect(ctrl.state.confirmText, contains('2 хүлээн авагч'));
      expect(ctrl.state.confirmText, contains('4 хэсэг'));
      expect(ctrl.state.confirmText, contains('160'));
      ctrl.setText('Мэдэгдэл 2');
      expect(ctrl.state.estimateIsCurrent, isFalse);
      expect(ctrl.state.canSend, isFalse);
    });

    test('бөөн: ноорог үүссэний дараа эхлүүлэх унавал дахин дарахад ноорог ДАХИН үүсгэхгүй', () async {
      final h = FakeHttp()
        ..json('POST', '/sms/bulk/estimate', smsEstimateJson)
        ..json('POST', '/sms/bulk', {'batchId': 'b1'})
        ..error('POST', '/sms/bulk/b1/start', 400, 'Идэвхтэй хүлээн авагч алга байна')
        ..json('POST', '/sms/bulk/b1/start', {'batchId': 'b1', 'status': 'SENDING', 'queued': 2});
      final ctrl = ctrlOf(h);
      ctrl.setRecipients('99000001 99000002');
      ctrl.setText('x');
      await ctrl.fetchEstimate();
      expect(await ctrl.send(), isFalse);
      expect(ctrl.state.pendingBatchId, 'b1');
      expect(ctrl.state.error, 'Идэвхтэй хүлээн авагч алга байна');
      expect(h.count('POST', '/sms/bulk/b1/start'), 1);
      expect(await ctrl.send(), isTrue);
      expect(h.count('POST', '/sms/bulk'), 1);
      expect(h.count('POST', '/sms/bulk/b1/start'), 2);
      expect(ctrl.state.success, '2 дугаарын илгээлт эхэллээ');
    });

    test('давхар товшилт: явж байхад хоёр дахь дуудлага юу ч илгээхгүй', () async {
      final h = FakeHttp()
        ..on('POST', '/sms/send', (_) => const FakeResponse({'messageId': 'm', 'segments': 1}, delay: Duration(milliseconds: 20)));
      final ctrl = ctrlOf(h);
      ctrl.setRecipients('99000001');
      ctrl.setText('x');
      final first = ctrl.send();
      expect(await ctrl.send(), isFalse);
      expect(await first, isTrue);
      expect(h.count('POST', '/sms/send'), 1);
    });

    test('илгээх унавал автоматаар давтахгүй, алдаа харуулна', () async {
      final h = FakeHttp()..on('POST', '/sms/send', (_) => const FakeResponse.network());
      final ctrl = ctrlOf(h);
      ctrl.setRecipients('99000001');
      ctrl.setText('x');
      expect(await ctrl.send(), isFalse);
      expect(h.count('POST', '/sms/send'), 1);
      expect(ctrl.state.error, isNotNull);
      expect(ctrl.state.sending, isFalse);
      expect(ctrl.state.text, 'x');
    });
  });
}
