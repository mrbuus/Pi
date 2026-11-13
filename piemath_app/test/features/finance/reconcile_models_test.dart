import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/finance/data/reconcile_models.dart';

import 'finance_fixtures.dart';

BankRow _row({
  int amount = 350000,
  String direction = 'CREDIT',
  Object? suggestion = const {},
  String? resolvedAt,
  bool resolvedBySystem = false,
  bool inSheet = false,
  List<Map<String, Object?>> allocations = const [],
}) => BankRow.fromJson(
  rowJson(
    amount: amount,
    direction: direction,
    suggestion: suggestion,
    resolvedAt: resolvedAt,
    resolvedBySystem: resolvedBySystem,
    inSheet: inSheet,
    allocations: allocations,
  ),
);

void main() {
  group('утга, илгээгч, утас', () {
    test('Хаан банкны «ХААНААС: дүн НЭР»-ийг салгана', () {
      expect(splitSender('99001122 Болд сургалт ХААНААС: 350000 ТЕСТИЙН БОЛД'), (
        main: '99001122 Болд сургалт',
        sender: 'ТЕСТИЙН БОЛД',
      ));
      expect(splitSender('  сургалт  '), (main: 'сургалт', sender: null));
      expect(splitSender('төлбөр хааНаас 1000 '), (main: 'төлбөр', sender: null));
    });

    test('8 оронтой дугаар л (9 оронтойн хэсэг биш)', () {
      expect(phonesInText('99001122, 880011223 утас:88112233'), {'99001122', '88112233'});
    });
  });

  group('мөр', () {
    test('өнгөний ангилал вэбийн rowTone-той ижил', () {
      expect(_row().tone, RowTone.open);
      expect(_row(resolvedAt: 'x', inSheet: true).tone, RowTone.sheet);
      expect(_row(resolvedAt: 'x', direction: 'DEBIT').tone, RowTone.expense);
      expect(_row(resolvedAt: 'x', resolvedBySystem: true, allocations: [allocJson()]).tone, RowTone.auto);
      expect(
        _row(
          resolvedAt: 'x',
          allocations: [allocJson(kind: 'SOCIAL')],
        ).tone,
        RowTone.done,
      );
      expect(
        _row(
          resolvedAt: 'x',
          allocations: [allocJson(kind: 'BOOK')],
        ).tone,
        RowTone.other,
      );
    });

    test('нэг товшилт: хуваах саналгүй орлогод; хүүхдийн бус зориулалтад «… гэж батлах»', () {
      final kid = _row();
      expect(kid.canQuickKid, isTrue);
      expect(kid.needsSplit, isFalse);
      expect(kid.nonKidKind, isNull);
      expect(kid.kidKind, AllocKind.tuition);
      // Ном хүүхэдтэй холбогддог — хүүхэд дээр дарж батална (вэбийн STUDENT_KINDS).
      final book = _row(suggestion: suggestionJson(kind: 'BOOK'));
      expect(book.nonKidKind, isNull);
      expect(book.kidKind, AllocKind.book);
      final transfer = _row(
        suggestion: suggestionJson(kind: 'TRANSFER', candidates: const []),
      );
      expect(transfer.nonKidKind, AllocKind.transfer);
      expect(transfer.kidKind, AllocKind.tuition);
      final split = _row(suggestion: suggestionJson(decision: 'SPLIT'));
      expect(split.canQuickKid, isFalse);
      expect(split.needsSplit, isTrue);
      expect(_row(direction: 'DEBIT').canQuickKid, isFalse);
      expect(_row(resolvedAt: 'x').needsSplit, isFalse);
    });

    test('шийтийн тэмдэглэл: холбосон, бичсэн нүд, бичээгүй шалтгаан, шинэ', () {
      final r = BankRow.fromJson(
        rowJson(
          resolvedAt: 'x',
          sheetWrites: const [
            {'studentId': 'k1', 'ok': true, 'cell': 'K14', 'month': '2026-11'},
            {'studentId': 'k2', 'ok': false, 'reason': 'шийтэд мөр олдсонгүй'},
          ],
        ),
      );
      expect(r.sheetNote('k1', inSheet: true), 'Ажилтны шийтийн бичлэгтэй холбосон');
      expect(r.sheetNote('k1', inSheet: false), 'Шийтэд бичсэн: K14 нүд, 11-р сар');
      expect(r.sheetNote('k2', inSheet: false), 'Шийтэд бичээгүй: шийтэд мөр олдсонгүй');
      expect(r.sheetNote('k3', inSheet: false), 'Шинэ төлбөр');
      expect(sheetWriteText(r.sheetWrites), 'Шийтэд бичлээ: K14 нүд, 11-р сар; Шийтэд бичсэнгүй: шийтэд мөр олдсонгүй');
      expect(sheetWriteText(const []), isNull);
    });

    test('санал: баримт давхардалгүй, шалтгааныг шошготой давхардуулахгүй', () {
      final s = _row(suggestion: suggestionJson(reason: 'Сургалтын төлбөр: утас таарсан')).suggestion!;
      expect(s.candidates.single.signalText, 'утас таарсан, нэр таарсан');
      expect(s.showReason, isFalse);
      expect(_row(suggestion: suggestionJson(reason: 'Ах дүү')).suggestion!.showReason, isTrue);
      expect(BankRow.fromJson(rowJson(suggestion: null)).suggestion, isNull);
      expect(() => BankRow.fromJson(const {}), throwsFormatException);
    });

    test('зориулалтын сонголт: орлогод зарлагагүй, зарлагад сургалтын төлбөргүй', () {
      expect(AllocKind.choicesFor(debit: false), isNot(contains(AllocKind.expense)));
      expect(AllocKind.choicesFor(debit: true), isNot(contains(AllocKind.tuition)));
      expect(AllocKind.choicesFor(debit: true), isNot(contains(AllocKind.social)));
      expect(AllocKind.fromApi('???'), AllocKind.other);
      expect(AllocKind.social.isTuition && AllocKind.social.forStudent, isTrue);
      expect(AllocKind.book.isTuition, isFalse);
    });

    test('AllocPart: хүүхдийн бус зориулалтад studentId илгээхгүй', () {
      expect(const AllocPart(kind: AllocKind.transfer, amount: 5, studentId: 'k1').toJson(), {
        'kind': 'TRANSFER',
        'amount': 5,
      });
    });
  });

  group('хуваах ноорог (вэбийн initialDrafts)', () {
    test('ах дүү: шийтийн дүнгээр, үлдэгдэл «Бусад»', () {
      final r = _row(
        amount: 700000,
        suggestion: suggestionJson(
          decision: 'SPLIT',
          kind: 'SOCIAL',
          candidates: [
            candJson(
              sheetPays: const [
                {'amount': 350000, 'date': '2026-11-03'},
              ],
            ),
            candJson(
              studentId: 'k2',
              sheetPays: const [
                {'amount': 270000, 'date': '2026-11-02'},
              ],
            ),
          ],
        ),
      );
      final d = initialDrafts(r);
      expect(d.guessed, isFalse);
      expect(
        [for (final x in d.drafts) (x.kind, x.amount, x.student?.id)],
        [(AllocKind.social, 350000, 'k1'), (AllocKind.social, 270000, 'k2'), (AllocKind.other, 80000, null)],
      );
    });

    test('шийтийн дүнгүй бол тэнцүү (мянгаар доош), сүүлийнх нь үлдэгдэл — «санал»', () {
      final r = _row(
        amount: 1000000,
        suggestion: suggestionJson(
          decision: 'SPLIT',
          candidates: [
            candJson(),
            candJson(studentId: 'k2'),
            candJson(studentId: 'k3'),
          ],
        ),
      );
      final d = initialDrafts(r);
      expect(d.guessed, isTrue);
      expect(d.drafts.map((x) => x.amount), [333000, 333000, 334000]);
      expect(d.drafts.every((x) => x.kind == AllocKind.tuition), isTrue);
    });

    test('серверийн split, нэг хүүхэд, зарлага', () {
      final split = initialDrafts(
        _row(
          suggestion: suggestionJson(
            split: const [
              {'kind': 'TUITION', 'amount': 300000},
              {'kind': 'BOOK', 'amount': 50000},
            ],
          ),
        ),
      );
      expect(
        [for (final x in split.drafts) (x.kind, x.amount, x.student?.id)],
        [(AllocKind.tuition, 300000, 'k1'), (AllocKind.book, 50000, 'k1')],
      );
      final one = initialDrafts(_row()).drafts.single;
      expect((one.kind, one.amount, one.student?.id), (AllocKind.tuition, 350000, 'k1'));
      final debit = initialDrafts(_row(direction: 'DEBIT')).drafts.single;
      expect((debit.kind, debit.student), (AllocKind.expense, null));
    });
  });

  group('хуулгын урьдчилсан шалгалт', () {
    test('зөвхөн .xlsx, хоосон, том, гэмтсэн', () {
      expect(StatementPreview.inspect('a.csv', Uint8List(3)).problem, 'Хаан банкнаас татсан .xlsx хуулга оруулна уу');
      expect(StatementPreview.inspect('a.xlsx', Uint8List(0)).problem, 'Файл хоосон байна');
      expect(
        StatementPreview.inspect('a.xlsx', Uint8List(StatementPreview.maxBytes + 1)).problem,
        'Файл 5 МБ-аас том байна',
      );
      expect(StatementPreview.inspect('a.xlsx', Uint8List.fromList([1, 2, 3, 4])).ok, isFalse);
      final ok = StatementPreview.inspect('KHAN.XLSX', xlsxBytes());
      expect(ok.ok, isTrue);
      expect(ok.sizeLabel, '8 байт');
    });
  });
}
