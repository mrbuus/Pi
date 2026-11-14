import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/core/time/ub_time.dart';
import 'package:piemath_app/shared/native/native.dart';

import '../../helpers/pump.dart';

/// «Нээх» товч — дарахад маягт нээгдэж, үр дүнг [results]-д бичнэ.
class _Opener extends StatelessWidget {
  const _Opener({required this.fields, required this.onSubmit, required this.results});

  final List<Widget> fields;
  final Future<Object?> Function(FormValues v) onSubmit;
  final List<Object?> results;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () async {
          results.add(await showFormSheet<Object?>(context, title: 'Сурагч засах', fields: fields, onSubmit: onSubmit));
        },
        child: const Text('Нээх'),
      ),
    );
  }
}

Future<void> _open(WidgetTester tester) async {
  await tester.tap(find.text('Нээх'));
  await tester.pumpAndSettle();
}

Finder _field(String label) => find.widgetWithText(TextField, label);

void main() {
  testWidgets('шаардлагатай талбар, утасны шалгалт монголоор; илгээхгүй', (tester) async {
    var submitted = 0;
    final results = <Object?>[];
    await pumpThemed(
      tester,
      _Opener(
        results: results,
        fields: const [
          FormTextField(name: 'name', label: 'Нэр', required: true),
          FormPhoneField(name: 'phone'),
        ],
        onSubmit: (_) async => submitted++,
      ),
    );
    await _open(tester);
    expect(find.text('Сурагч засах'), findsOneWidget);
    await tester.enterText(_field('Утасны дугаар'), '9911');
    await tester.tap(find.text('Хадгалах'));
    await tester.pumpAndSettle();
    expect(find.text(FormMessages.required), findsOneWidget);
    expect(find.text(FormMessages.phone), findsOneWidget);
    expect(submitted, 0);

    // Засахад алдаа шууд арилна (onUserInteraction).
    await tester.enterText(_field('Нэр'), 'Бат');
    await tester.enterText(_field('Утасны дугаар'), '99112233');
    await tester.pump();
    expect(find.text(FormMessages.required), findsNothing);
    expect(find.text(FormMessages.phone), findsNothing);
  });

  testWidgets('илгээх: хадгалж байх төлөв, утгууд, үр дүн буцаана', (tester) async {
    final done = Completer<Object?>();
    FormValues? got;
    final results = <Object?>[];
    await pumpThemed(
      tester,
      _Opener(
        results: results,
        fields: [
          const FormTextField(name: 'name', label: 'Нэр', initial: 'Бат'),
          const FormNumberField(name: 'age', label: 'Нас', min: 5, max: 99),
          const FormMoneyField(name: 'fee', label: 'Төлбөр'),
          const FormSwitchField(name: 'active', label: 'Идэвхтэй'),
          FormDateField(name: 'day', label: 'Эхлэх өдөр', initial: UbDateTime(2026, 11, 4)),
          const FormTimeField(name: 'at', label: 'Цаг', initial: TimeOfDay(hour: 15, minute: 30)),
        ],
        onSubmit: (v) {
          got = v;
          return done.future;
        },
      ),
    );
    await _open(tester);
    await tester.enterText(_field('Нас'), '4');
    await tester.enterText(_field('Төлбөр'), '2500000');
    await tester.pump();
    expect(find.text('2,500,000'), findsOneWidget);
    await tester.tap(find.text('Хадгалах'));
    await tester.pumpAndSettle();
    expect(find.text(FormMessages.min(5)), findsOneWidget);

    await tester.enterText(_field('Нас'), '12');
    await tester.ensureVisible(find.text('Идэвхтэй'));
    await tester.tap(find.text('Идэвхтэй'));
    await tester.pump();
    await tester.tap(find.text('Хадгалах'));
    await tester.pump();
    expect(find.text(FormMessages.saving), findsOneWidget);
    expect(got!.text('name'), 'Бат');
    expect(got!.integer('age'), 12);
    expect(got!.integer('fee'), 2500000);
    expect(got!.boolean('active'), isTrue);
    expect(got!.date('day'), UbDateTime(2026, 11, 4));
    expect(got!.time('at'), const TimeOfDay(hour: 15, minute: 30));

    done.complete('ok');
    await tester.pumpAndSettle();
    expect(find.text('Сурагч засах'), findsNothing);
    expect(results, ['ok']);
  });

  testWidgets('серверийн алдаа маягт дотор, хаагдахгүй', (tester) async {
    final results = <Object?>[];
    await pumpThemed(
      tester,
      _Opener(
        results: results,
        fields: const [FormTextField(name: 'name', label: 'Нэр')],
        onSubmit: (_) async => throw const ApiError(ApiErrorKind.conflict, 'Энэ утас бүртгэлтэй байна'),
      ),
    );
    await _open(tester);
    await tester.tap(find.text('Хадгалах'));
    await tester.pumpAndSettle();
    expect(find.text('Энэ утас бүртгэлтэй байна'), findsOneWidget);
    expect(find.text('Сурагч засах'), findsOneWidget);
    expect(results, isEmpty);
  });

  testWidgets('хадгалаагүй өөрчлөлттэй хаах: асууна, «Үргэлжлүүлэх», «Хаах»', (tester) async {
    final results = <Object?>[];
    await pumpThemed(
      tester,
      _Opener(
        results: results,
        fields: const [FormTextField(name: 'name', label: 'Нэр', initial: 'Бат')],
        onSubmit: (_) async => 'x',
      ),
    );
    await _open(tester);

    // Өөрчлөлтгүй — шууд хаагдана.
    await tester.tap(find.byTooltip('Хаах'));
    await tester.pumpAndSettle();
    expect(find.text('Сурагч засах'), findsNothing);
    expect(results, [null]);

    await _open(tester);
    await tester.enterText(_field('Нэр'), 'Болд');
    await tester.pump();
    await tester.tap(find.byTooltip('Хаах'));
    await tester.pumpAndSettle();
    expect(find.text(FormMessages.unsavedTitle), findsOneWidget);
    await tester.tap(find.text(FormMessages.keepEditing));
    await tester.pumpAndSettle();
    expect(find.text('Сурагч засах'), findsOneWidget);
    expect(find.text('Болд'), findsOneWidget);

    // Анхны утга руу буцаавал өөрчлөлтгүй гэж үзнэ.
    await tester.enterText(_field('Нэр'), 'Бат');
    await tester.pump();
    await tester.enterText(_field('Нэр'), 'Дорж');
    await tester.pump();

    // Гадна (barrier) дарахад ч асууна.
    await tester.tapAt(const Offset(20, 20));
    await tester.pumpAndSettle();
    expect(find.text(FormMessages.unsavedTitle), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, FormMessages.discard));
    await tester.pumpAndSettle();
    expect(find.text('Сурагч засах'), findsNothing);
    expect(results, [null, null]);
  });

  testWidgets('доош чирвэл хаах оролдлого — өөрчлөлттэй бол асууна', (tester) async {
    final results = <Object?>[];
    await pumpThemed(
      tester,
      _Opener(
        results: results,
        fields: const [FormTextField(name: 'name', label: 'Нэр')],
        onSubmit: (_) async => 'x',
      ),
    );
    await _open(tester);
    await tester.enterText(_field('Нэр'), 'Болд');
    await tester.pump();
    await tester.fling(find.text('Сурагч засах'), const Offset(0, 700), 2000);
    await tester.pumpAndSettle();
    expect(find.text(FormMessages.unsavedTitle), findsOneWidget);
    await tester.tap(find.text(FormMessages.keepEditing));
    await tester.pumpAndSettle();
    expect(find.text('Сурагч засах'), findsOneWidget);
  });

  testWidgets('нэг сонголт (select sheet), олон сонголт чип', (tester) async {
    FormValues? got;
    final results = <Object?>[];
    await pumpThemed(
      tester,
      _Opener(
        results: results,
        fields: const [
          FormSelectField<String>(
            name: 'room',
            label: 'Танхим',
            required: true,
            options: [SelectOption('a', '501 танхим'), SelectOption('b', '502 танхим')],
          ),
          FormMultiSelectField<int>(
            name: 'days',
            label: 'Гараг',
            required: true,
            options: [SelectOption(1, 'Даваа'), SelectOption(3, 'Лхагва'), SelectOption(5, 'Баасан')],
          ),
        ],
        onSubmit: (v) async => got = v,
      ),
    );
    await _open(tester);
    await tester.tap(find.text('Хадгалах'));
    await tester.pumpAndSettle();
    expect(find.text(FormMessages.choose), findsOneWidget);
    expect(find.text(FormMessages.chooseAtLeastOne), findsOneWidget);

    await tester.tap(find.text('Сонгох'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('502 танхим'));
    await tester.pumpAndSettle();
    expect(find.text('502 танхим'), findsOneWidget);

    await tester.tap(find.text('Даваа'));
    await tester.tap(find.text('Баасан'));
    await tester.pump();
    await tester.tap(find.text('Хадгалах'));
    await tester.pumpAndSettle();
    expect(got!.get<String>('room'), 'b');
    expect(got!.many<int>('days'), {1, 5});
  });

  test('ThousandsFormatter, мөнгө задлах', () {
    const f = ThousandsFormatter();
    final v = f.formatEditUpdate(TextEditingValue.empty, const TextEditingValue(text: '1234567'));
    expect(v.text, '1,234,567');
    expect(FormMoneyField.parse('1,234,567'), 1234567);
    expect(FormMoneyField.parse(''), isNull);
    expect(FormNumberField.parseNumber('2,5', decimal: true), 2.5);
    expect(FormNumberField.parseNumber('2.5', decimal: false), isNull);
  });
}
