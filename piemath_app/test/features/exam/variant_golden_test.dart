import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart';
import 'package:piemath_app/features/exam/domain/test_list_logic.dart';

/// А/Б хувилбарын сонголт: сервер `variantId` ӨГДӨГГҮЙ (`api/src/tests/**`), вэб `components/test-list/types.ts`-д
/// `pickForStudent`-ийг локалаар тооцдог. Апп ЯГ ижил гаргах ёстой. Доорх векторыг вэбийн функцээр node-оор тооцсон:
/// `h=0; for i<key.length: h=(h*31+key.charCodeAt(i))>>>0`.
const _golden = <(String, int)>[
  ('u1:Илтгэгч тэгшитгэл 1', 1034218167),
  ('ck9abc:Логарифм 3', 817794252),
  ('student-xyz:1000:Y3', 1190689410),
  (':Өнцөг 12', 100579296),
  ('cmh123:\u{1D538} тест', 125502635),
  ('', 0),
  ('a', 97),
  ('ab', 3105),
  ('cmgq0z8xk0001abcd:Тригонометр 7', 3124742730),
  ('cmgq0z8xk0002abcd:Тригонометр 7', 2280270859),
  ('cmgq0z8xk0003abcd:Тригонометр 7', 1435798988),
  ('u2:Илтгэгч тэгшитгэл 1', 1245569080),
  ('u3:Илтгэгч тэгшитгэл 1', 1456919993),
  ('student-1:Вектор 4', 2053752508),
  ('student-2:Вектор 4', 1857239003),
  ('student-3:Вектор 4', 1660725498),
  ('cm1:1000:S10', 3666882858),
  ('cm1:100V3 Функц 2', 3263029719),
  ('ck:Өө Үү өө үү 9', 1221865095),
  ('x:y', 117239),
  ('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzz:Урт түлхүүр бүхий бүлэг тест 25', 1114470894),
  ('u9:Бусад', 3748907485),
  ('\u{10FFFF}:x', 1732907870),
  ('user_é:ñandú 5', 1362636932),
  ('cl9:Нийлбэр, ялгавар 11', 1656032344),
];

TestRow _row(String id, String groupKey, {SessionStatus status = SessionStatus.none, bool result = false}) => TestRow(
  id: id,
  title: groupKey,
  type: 'DAILY',
  groupKey: groupKey,
  sessionStatus: status,
  results: result ? const [ScorePair(1, 2)] : const [],
);

void main() {
  group('variantHash: вэбтэй ижил (golden вектор)', () {
    for (final (key, want) in _golden) {
      test('hash(${key.length} тэмдэгт) = $want', () => expect(variantHash(key), want));
    }
    test('вектор 20-иос олон', () => expect(_golden.length, greaterThanOrEqualTo(20)));
  });

  group('pickForStudent: rows[hash % N] (вэб)', () {
    for (final (key, want) in _golden) {
      final i = key.indexOf(':');
      if (i <= 0) continue;
      final student = key.substring(0, i);
      final group = key.substring(i + 1);
      for (final n in [2, 3]) {
        test('N=$n, $key', () {
          final rows = [for (var k = 0; k < n; k++) _row('r$k', group)];
          expect(pickForStudent(rows, student).id, 'r${want % n}');
        });
      }
    }

    test('studentId null → «:бүлэг» түлхүүр', () {
      final rows = [_row('a', 'Өнцөг 12'), _row('b', 'Өнцөг 12')];
      expect(pickForStudent(rows, null).id, 'a'); // 100579296 % 2 == 0
    });
  });
}
