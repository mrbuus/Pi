import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/auth/token_holder.dart';
import 'package:piemath_app/core/network/api_client.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/results/data/results_models.dart';
import 'package:piemath_app/features/results/data/results_repository.dart';
import 'package:piemath_app/features/teacher/domain/test_run_row.dart';

import '../../helpers/fake_http.dart';
import 'results_fixtures.dart';

ResultsRepository _repo(FakeHttp http) =>
    ResultsRepository(ApiClient(baseUrl: 'https://api.test/api', tokens: TokenHolder(), dio: http.dio()));

void main() {
  test('дүн: оноо, эх сурвалж, бүрэн бүтэн байдлын тоо (> 0 л)', () async {
    final rows = await _repo(resultsHttp()).results('t1');
    expect(rows, hasLength(3));
    final s2 = rows[1];
    expect(s2.name, 'Өлзий Дорж');
    expect(s2.isOnline, isTrue);
    expect(s2.percent, 75);
    expect(s2.scoreText, '30/40');
    expect(s2.run.indicators.single.kind, IntegrityKind.leave);
    expect(rows.first.run.indicators, isEmpty);
    expect(ResultSource.label('MANUAL_ENTRY'), 'Цаасан (гараар)');
    expect(ResultSource.label('OMR_IMPORT'), 'Онлайн (OMR)');
  });

  test('тестийн мета: зөвхөн нэр, оноосон анги (хариу хадгалахгүй)', () async {
    final m = await _repo(resultsHttp()).meta('t1');
    expect(m.title, 'Тэгшитгэл A');
    expect(m.accessClassIds, {'c1'});
  });

  test('бүртгэл: өнөөдрийн огноогоор; хайлт: q', () async {
    final http = resultsHttp();
    final repo = _repo(http);
    final roster = await repo.roster('c1', '2026-11-04');
    expect(roster.map((s) => s.name), ['Анар Бат', 'Өлзий Дорж', 'Нараа Ган']);
    expect(http.requests.last.queryParameters, {'date': '2026-11-04'});
    final hits = await repo.searchStudents('Тэм');
    expect(hits.single.studentCode, 'B27120009');
    expect(http.requests.last.queryParameters, {'q': 'Тэм'});
  });

  test('дүн оруулах: шалтгаан зөвхөн өгсөн үед; серверийн алдаа монголоор', () async {
    final http = resultsHttp();
    final repo = _repo(http);
    await repo.enterResult('t1', studentId: 's3', totalScore: 20, maxScore: 40);
    expect(requestBody(http, 'POST', '/tests/t1/results'), {'studentId': 's3', 'totalScore': 20.0, 'maxScore': 40.0});
    await repo.enterResult('t1', studentId: 's2', totalScore: 31, maxScore: 40, reason: ' түлхүүр зассан ');
    expect(requestBody(http, 'POST', '/tests/t1/results')['reason'], 'түлхүүр зассан');

    http.error('POST', '/tests/t2/results', 403, 'Онлайнаар өгсөн дүнг зөвхөн Багш+ эсвэл админ засна');
    await expectLater(
      repo.enterResult('t2', studentId: 's2', totalScore: 1, maxScore: 2),
      throwsA(isA<ApiError>().having((e) => e.message, 'message', contains('Багш+'))),
    );
  });

  test('анализ: «Бүгд» = all, анги; зөв хариуны үсэг, бодолт уншихгүй', () async {
    final http = resultsHttp();
    final repo = _repo(http);
    final all = await repo.analytics('t1');
    expect(http.requests.last.queryParameters, {'classroomId': 'all'});
    await repo.analytics('t1', classId: 'c1');
    expect(http.requests.last.queryParameters, {'classroomId': 'c1'});

    expect(all.title, 'Тэгшитгэл A');
    expect(all.chips.map((c) => c.name), ['12А', '11Б']);
    expect(all.summary.avg, 62);
    expect(all.summary.expected, 11);
    expect(all.histogram, [1, 1, 3, 3, 2]);
    expect(all.reliability!.text, 'Найдвартай');
    expect(all.classes.first.avg, 70);
    expect(all.topics.last.percent, 30);
    final i2 = all.items[1];
    expect(i2.name, '#2');
    expect(i2.percent, 20);
    expect(i2.discrimination, DiscriminationLabel.problem);
    expect(i2.choices!.counts, {'A': 1, 'B': 2, 'C': 6});
    expect(i2.choices!.mostWrong!.letter, 'C');
    expect(i2.choices!.mostWrong!.note, 'Тэмдэг андуурсан');
    expect(all.attentionItems.map((i) => i.key), ['2', '1']);
  });

  test('сурагчийн задаргаа: хэсэг, алдсан, явц', () async {
    final a = await _repo(resultsHttp()).studentAttempt('t1', 's1');
    expect(a.name, 'Анар Бат');
    expect(a.hasResult, isTrue);
    expect(a.percent, 90);
    expect(a.parts!.part2Max, 8);
    expect(a.wrong.map((w) => w.status), [ItemStatus.wrong, ItemStatus.blank]);
    expect(a.trend.first.current, isTrue);
    expect(a.topics.single.percent, 100);
  });
}
