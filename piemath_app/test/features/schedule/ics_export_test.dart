import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/user_role.dart';
import 'package:piemath_app/features/schedule/data/ics_opener.dart';

import '../../helpers/fake_http.dart';
import '../student_fixtures.dart';
import '../student_harness.dart';

class _Opener implements IcsOpener {
  _Opener({this.ok = true});

  final bool ok;
  final opened = <String>[];

  @override
  Future<bool> open(String ics) async {
    opened.add(ics);
    return ok;
  }
}

const _ics = 'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Алгебр\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n';

FakeHttp _http(Object? ics) => FakeHttp()
  ..json('GET', '/schedule/me', scheduleMeJson())
  ..json('GET', '/schedule/week', weekJson('2026-11-02'))
  ..json('GET', '/schedule/me/ics', ics);

void main() {
  test('IcsExport.hasEvents: үйл явдалгүй хуанли', () {
    expect(IcsExport.fromJson({'filename': 'a.ics', 'ics': _ics}).hasEvents, isTrue);
    expect(IcsExport.fromJson({'filename': 'a.ics', 'ics': 'BEGIN:VCALENDAR\r\nEND:VCALENDAR'}).hasEvents, isFalse);
    expect(IcsExport.fromJson(null).hasEvents, isFalse);
  });

  testWidgets('сурагч: товшоход л /schedule/me/ics татаж, хуанли руу нээнэ', (tester) async {
    final opener = _Opener();
    final http = _http({'filename': 'x.ics', 'ics': _ics});
    await pumpStudentRoute(
      tester,
      http: http,
      location: '/app/schedule',
      overrides: [icsOpenerProvider.overrideWithValue(opener)],
    );
    await settle(tester);
    expect(http.count('GET', '/schedule/me/ics'), 0);
    await tester.tap(find.byTooltip('Утасны хуанлид нэмэх'));
    await settle(tester);
    expect(http.count('GET', '/schedule/me/ics'), 1);
    expect(opener.opened, [_ics]);
  });

  testWidgets('хичээл байхгүй хуанли: нээхгүй, тайлбарлана', (tester) async {
    final opener = _Opener();
    final http = _http({'filename': 'x.ics', 'ics': 'BEGIN:VCALENDAR\r\nEND:VCALENDAR'});
    await pumpStudentRoute(
      tester,
      http: http,
      location: '/app/schedule',
      overrides: [icsOpenerProvider.overrideWithValue(opener)],
    );
    await settle(tester);
    await tester.tap(find.byTooltip('Утасны хуанлид нэмэх'));
    await settle(tester);
    expect(opener.opened, isEmpty);
    expect(find.text('Хуанлид нэмэх хичээл одоогоор алга'), findsOneWidget);
  });

  testWidgets('нээж чадаагүй: монгол мессеж', (tester) async {
    final opener = _Opener(ok: false);
    await pumpStudentRoute(
      tester,
      http: _http({'filename': 'x.ics', 'ics': _ics}),
      location: '/app/schedule',
      overrides: [icsOpenerProvider.overrideWithValue(opener)],
    );
    await settle(tester);
    await tester.tap(find.byTooltip('Утасны хуанлид нэмэх'));
    await settle(tester);
    expect(find.textContaining('нээж чадсангүй'), findsOneWidget);
  });

  testWidgets('эцэг эхэд товч харагдахгүй (API зөвхөн сурагч, багш)', (tester) async {
    final http = FakeHttp()..json('GET', '/schedule/week', weekJson('2026-11-02'));
    await pumpStudentRoute(tester, http: http, location: '/app/schedule', role: UserRole.parent);
    await settle(tester);
    expect(find.byTooltip('Утасны хуанлид нэмэх'), findsNothing);
  });
}
