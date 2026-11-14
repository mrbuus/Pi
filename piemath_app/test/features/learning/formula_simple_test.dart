import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/core/ui/tokens.dart';
import 'package:piemath_app/features/learning/data/formula_models.dart';
import 'package:piemath_app/features/learning/data/formula_repository.dart';
import 'package:piemath_app/features/learning/ui/formula_detail_screen.dart';
import 'package:piemath_app/features/learning/ui/formula_simple_view.dart';
import 'package:piemath_app/features/learning/ui/formulas_screen.dart';

import '../../helpers/fake_http.dart';
import 'learning_test_app.dart';

const _web = 'https://web.test';
const _list = '$_web/tools/formulas.json';
const _detail = '$_web/tools/formulas-detail/geo.json';

Map<String, Object?> _lightFormula() => {
  'slug': 'pyth',
  'title': 'Пифагорын теорем',
  'section': 'geo',
  'order': 1,
  'level': 'CORE',
  'latex': r'a^2+b^2=c^2',
  'simple': {
    'say': r'Тэгш өнцөгт гурвалжны хоёр катетын квадратын нийлбэр нь гипотенузын квадраттай тэнцүү',
    'formula': r'\colA{a}^2+\colB{b}^2=\colC{c}^2',
    'parts': [
      {'tex': r'\colA{a}', 'mean': 'эхний катет'},
      {'tex': r'\colC{c}', 'mean': 'хамгийн урт тал'},
    ],
  },
};

Map<String, Object?> _catalog() => {
  'version': 2,
  'detail': true,
  'count': 2,
  'sections': [
    {'slug': 'geo', 'title': 'Геометр', 'order': 1, 'count': 2},
  ],
  'formulas': [
    _lightFormula(),
    {'slug': 'area', 'title': 'Тэгш өнцөгтийн талбай', 'section': 'geo', 'order': 2, 'level': 'CORE', 'latex': 'S=ab'},
  ],
};

Map<String, Object?> _sectionDetail() => {
  'pyth': {
    'explanation': 'урт тайлбар',
    'simpleMore': {
      'steps': ['Катетуудыг ол', r'Квадратуудыг нэм'],
      'example': {
        'problem': r'$\colA{a}=3$, $\colB{b}=4$ бол $\colC{c}$-г ол',
        'steps': [r'\colC{c}^2=9+16=25'],
        'answer': r'$\colC{c}=5$',
      },
      'watch': 'Гипотенузыг катетаар бүү сольж андуур',
    },
  },
};

Map<String, Object?> _apiDetail() => {
  'slug': 'pyth',
  'title': 'Пифагорын теорем',
  'section': {'slug': 'geo', 'title': 'Геометр'},
  'latex': r'a^2+b^2=c^2',
  'related': <Object?>[],
};

void main() {
  final overrides = [formulaWebBaseProvider.overrideWithValue(_web)];

  test('seenGroupOf: өнөөдөр, энэ долоо хоног (Даваагаас), өмнө (UB өдрөөр)', () {
    final now = UbDateTime(2026, 11, 12, 10); // Лхагва
    expect(seenGroupOf(DateTime.utc(2026, 11, 12, 1), now), SeenGroup.today);
    expect(seenGroupOf(DateTime.utc(2026, 11, 9, 1), now), SeenGroup.week, reason: 'Даваа');
    expect(seenGroupOf(DateTime.utc(2026, 11, 8, 15), now), SeenGroup.earlier, reason: 'Ням 23:00 UB');
    expect(seenGroupOf(DateTime.utc(2026, 11, 11, 17), now), SeenGroup.today, reason: 'UTC өчигдөр ч UB өнөөдөр');
    expect(seenGroupOf(null, now), SeenGroup.earlier);
  });

  group('өгөгдөл', () {
    test('simple задлал: say/formula байхгүй бол null, parts хоосон tex хасна', () {
      expect(FormulaSimple.tryParse({'say': 'a'}), isNull);
      final s = FormulaSimple.tryParse(_lightFormula()['simple']);
      expect(s!.parts, hasLength(2));
      expect(FormulaSimpleMore.tryParse(<String, Object?>{}), isNull);
      expect(FormulaSimpleMore.tryParse({'steps': ['a']})!.steps, ['a']);
    });

    test('хайлт: энгийн өгүүлбэр, үсгийн утгаар (томьёоны тэмдэгтгүй)', () {
      final all = [for (final f in (_catalog()['formulas']! as List<Object?>)) FormulaSummary.fromJson(f)];
      expect(filterFormulas(all, query: 'катет').map((f) => f.slug), ['pyth']);
      expect(filterFormulas(all, query: 'хамгийн урт').map((f) => f.slug), ['pyth']);
      expect(filterFormulas(all, query: 'colA'), isEmpty);
      expect(filterFormulas(all, query: 'талбай').map((f) => f.slug), ['area']);
    });

    test('өнгө зөвхөн токеноос: \\colA..D → \\textcolor, шар/алт үгүй', () {
      for (final c in [AppColors.light, AppColors.dark]) {
        final out = colorizeTex(r'\colA{a}+\colB{b}+\colC{c}+\colD{d}', c);
        expect(out, isNot(contains(r'\col')));
        expect(RegExp(r'\\textcolor\{#[0-9A-F]{6}\}').allMatches(out), hasLength(4));
        expect(out, contains(c.brandBright.toARGB32().toRadixString(16).substring(2).toUpperCase()));
      }
    });
  });

  group('дэлгэц', () {
    testWidgets('жагсаалт статик файлаас: API-н жагсаалтыг дууддаггүй, энгийн тайлбараар хайна', (tester) async {
      final http = FakeHttp()
        ..json('GET', _list, _catalog())
        ..json('GET', '/formulas/my', {'totalFormulas': 2, 'seenFormulas': 0, 'items': <Object?>[]});
      await pumpLearning(tester, http, location: '/app/formulas', overrides: overrides);
      expect(find.byType(FormulasScreen), findsOneWidget);
      expect(find.text('Пифагорын теорем'), findsOneWidget);
      expect(find.text('Тэгш өнцөгтийн талбай'), findsOneWidget);
      expect(http.count('GET', '/formulas'), 0);
      expect(http.count('GET', _detail), 0);

      await tester.enterText(find.byType(TextField), 'катет');
      await tester.pump();
      expect(find.text('Пифагорын теорем'), findsOneWidget);
      expect(find.text('Тэгш өнцөгтийн талбай'), findsNothing);
    });

    testWidgets('статик файл унавал API-аар үргэлжилнэ', (tester) async {
      final http = FakeHttp()
        ..error('GET', _list, 503)
        ..json('GET', '/formulas/sections', [
          {'slug': 'geo', 'title': 'Геометр', 'order': 1, 'count': 1},
        ])
        ..json('GET', '/formulas', [_lightFormula()..remove('simple')])
        ..json('GET', '/formulas/my', {'totalFormulas': 1, 'seenFormulas': 0, 'items': <Object?>[]});
      await pumpLearning(tester, http, location: '/app/formulas', overrides: overrides);
      expect(find.text('Пифагорын теорем'), findsOneWidget);
      expect(http.count('GET', '/formulas'), 1);
    });

    testWidgets('жагсаалт хоёр дахь удаа кэшээс: дахин татахгүй', (tester) async {
      final http = FakeHttp()
        ..json('GET', _list, _catalog())
        ..json('GET', '/formulas/my', {'totalFormulas': 2, 'seenFormulas': 0, 'items': <Object?>[]})
        ..json('GET', '/formulas/pyth', _apiDetail());
      final router = await pumpLearning(tester, http, location: '/app/formulas', overrides: overrides);
      unawaited(router.push<void>('/app/formulas/pyth'));
      await settle(tester);
      router.pop();
      await settle(tester);
      expect(http.count('GET', _list), 1);
    });

    testWidgets('дэлгэрэнгүй: энгийн тайлбар шууд, алхам нь дарахад л татагдана', (tester) async {
      final http = FakeHttp()
        ..json('GET', _list, _catalog())
        ..json('GET', _detail, _sectionDetail())
        ..json('GET', '/formulas/pyth', _apiDetail());
      await pumpLearning(tester, http, location: '/app/formulas/pyth', overrides: overrides);
      expect(find.byType(FormulaDetailScreen), findsOneWidget);
      expect(find.textContaining('хоёр катетын квадратын нийлбэр', findRichText: true), findsOneWidget);
      expect(find.textContaining('textcolor', findRichText: true), findsNothing);
      expect(find.text('Алхамаар ойлгох'), findsOneWidget);
      expect(http.count('GET', _detail), 0);

      await tester.tap(find.text('Алхамаар ойлгох'));
      await settle(tester);
      expect(http.count('GET', _detail), 1);
      expect(find.text('Алхмуудыг хураах'), findsOneWidget);
      expect(find.text('Катетуудыг ол', skipOffstage: false), findsOneWidget);
      expect(find.text('Хариу: ', skipOffstage: false), findsOneWidget);
      expect(find.textContaining('Гипотенузыг катетаар', findRichText: true, skipOffstage: false), findsOneWidget);

      // Хураагаад дахин нээхэд дахин татахгүй
      await tester.tap(find.text('Алхмуудыг хураах'));
      await settle(tester);
      await tester.tap(find.text('Алхамаар ойлгох'));
      await settle(tester);
      expect(http.count('GET', _detail), 1);
    });

    testWidgets('алхам татахад алдаа: монгол мессеж ба дахин оролдох', (tester) async {
      final http = FakeHttp()
        ..json('GET', _list, _catalog())
        ..error('GET', _detail, 500)
        ..json('GET', _detail, _sectionDetail())
        ..json('GET', '/formulas/pyth', _apiDetail());
      await pumpLearning(tester, http, location: '/app/formulas/pyth', overrides: overrides);
      await tester.tap(find.text('Алхамаар ойлгох'));
      await settle(tester);
      expect(find.text('Алхмуудыг ачаалж чадсангүй', skipOffstage: false), findsOneWidget);

      await tester.tap(find.text('Дахин оролдох', skipOffstage: false));
      await settle(tester);
      expect(find.text('Катетуудыг ол', skipOffstage: false), findsOneWidget);
    });

    testWidgets('энгийн тайлбаргүй (API-аар) бол хуучин дэлгэрэнгүй хэвээр', (tester) async {
      final http = FakeHttp()
        ..error('GET', _list, 503)
        ..json('GET', '/formulas/sections', <Object?>[])
        ..json('GET', '/formulas', [_lightFormula()..remove('simple')])
        ..json('GET', '/formulas/pyth', {..._apiDetail(), 'explanation': 'Энгийнээр тайлбарлавал'});
      await pumpLearning(tester, http, location: '/app/formulas/pyth', overrides: overrides);
      expect(find.text('Алхамаар ойлгох'), findsNothing);
      expect(find.text('Энгийнээр'), findsOneWidget);
      expect(find.text('Энгийнээр тайлбарлавал'), findsOneWidget);
    });

    testWidgets('бүлгийн дэлгэрэнгүйд томьёо байхгүй бол монгол мэдэгдэл', (tester) async {
      final http = FakeHttp()
        ..json('GET', _list, _catalog())
        ..json('GET', _detail, <String, Object?>{})
        ..json('GET', '/formulas/pyth', _apiDetail());
      await pumpLearning(tester, http, location: '/app/formulas/pyth', overrides: overrides);
      await tester.tap(find.text('Алхамаар ойлгох'));
      await settle(tester);
      expect(find.text('Алхам хараахан нэмэгдээгүй байна', skipOffstage: false), findsOneWidget);
    });
  });
}
