import 'dart:math';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/exam/data/exam_models.dart' show ChoiceMode, ProblemFormat;
import 'package:piemath_app/features/exam/domain/fill_slots.dart';
import 'package:piemath_app/features/learning/data/formula_models.dart';
import 'package:piemath_app/features/learning/data/lesson_models.dart';
import 'package:piemath_app/features/learning/data/mistake_models.dart';
import 'package:piemath_app/features/learning/data/practice_models.dart';
import 'package:piemath_app/features/learning/data/study_models.dart';
import 'package:piemath_app/features/learning/domain/mistake_answer.dart';
import 'package:piemath_app/features/learning/domain/study_logic.dart';
import 'package:piemath_app/features/learning/domain/video_source.dart';

MistakeProblem problem({ProblemFormat format = ProblemFormat.choice, ChoiceMode? mode, List<String>? choices, List<String> fields = const []}) =>
    MistakeProblem(id: 'p', format: format, choiceMode: mode, choices: choices, answerFields: fields);

void main() {
  group('алдааны дэвтрийн хариу', () {
    test('нүдтэй тоо нөхөх: түлхүүрээр объект, дутуу бол null', () {
      final p = problem(format: ProblemFormat.fillNumber, fields: ['a', 'bc']);
      expect(buildRetryAnswer(p, '354'), {'a': '3', 'bc': '54'});
      expect(buildRetryAnswer(p, '3_4'), isNull);
      expect(buildRetryAnswer(p, ''), isNull);
      expect(buildRetryAnswer(p, null), isNull);
    });

    test('сонголт индекс, мөр тайрагдана', () {
      final p = problem(mode: ChoiceMode.text, choices: ['a', 'b']);
      expect(buildRetryAnswer(p, 1), 1);
      expect(buildRetryAnswer(p, 0), 0);
      expect(buildRetryAnswer(problem(format: ProblemFormat.open), '  x=2 '), 'x=2');
      expect(buildRetryAnswer(problem(format: ProblemFormat.open), '   '), isNull);
    });

    test('slotStringToMap', () {
      expect(slotStringToMap([const FillSlotGroup('a')], '7'), {'a': '7'});
      expect(slotStringToMap([const FillSlotGroup('a'), const FillSlotGroup('b')], '7'), isNull);
    });

    test('өмнөх хариуг харуулах', () {
      final p = problem(mode: ChoiceMode.text, choices: [r'$1$', r'$2$']);
      expect(displayGivenAnswer(p, 1), r'$2$');
      expect(displayGivenAnswer(p, 7), '7');
      expect(displayGivenAnswer(p, null), isNull);
      expect(displayGivenAnswer(p, ''), isNull);
      expect(displayGivenAnswer(p, '{"a":"3","bc":"54"}'), 'a: 3, bc: 54');
      expect(displayGivenAnswer(p, {'a': 1}), 'a: 1');
      expect(displayGivenAnswer(p, '[1,2]'), '1, 2');
      expect(displayCorrectAnswer(null), isNull);
      expect(displayCorrectAnswer(r'$4$'), r'$4$');
    });
  });

  group('алдааны загвар', () {
    test('Mistake.fromJson: үл мэдэгдэх утга аюулгүй', () {
      final m = Mistake.fromJson(const <String, Object?>{'id': 'm', 'status': 'ХАТУУ', 'problem': <String, Object?>{'format': 'OPEN', 'choices': null}, 'reason': 'XX'});
      expect(m.status, MistakeStatus.fresh);
      expect(m.reason, isNull);
      expect(m.correctAnswer, isNull);
      expect(m.hasSolutionRevealed, isFalse);
    });

    test('Notebook.fromJson, counts.moved', () {
      final n = Notebook.fromJson(const {
        'counts': {'NEW': 2, 'RETRYING': 0, 'MASTERED': 1},
        'byTopic': [
          {'topic': 'А', 'count': 3},
          {'count': 1},
        ],
        'items': [
          {'id': '1'},
        ],
        'nextCursor': 'c',
      });
      expect(n.byTopic.length, 1);
      expect(n.items.single.id, '1');
      final moved = n.counts.moved(MistakeStatus.fresh, MistakeStatus.mastered);
      expect((moved.fresh, moved.retrying, moved.mastered), (1, 0, 2));
      expect(n.counts.moved(MistakeStatus.retrying, MistakeStatus.fresh).retrying, 0);
    });

    test('RetryResult.applyTo зөв хариуг сервер өгсний дараа л нээнэ', () {
      final m = Mistake.fromJson(const {'id': '1', 'problem': <String, Object?>{}, 'retryCount': 1});
      expect(m.hasSolutionRevealed, isFalse);
      final r = RetryResult.fromJson(const {'correct': false, 'correctAnswer': r'$2$', 'status': 'RETRYING', 'retryCount': 2});
      final u = r.applyTo(m);
      expect(u.correctAnswer, r'$2$');
      expect(u.retryCount, 2);
      expect(u.status, MistakeStatus.retrying);
    });

    test('copyWith зөвхөн заасныг өөрчилнө, null-ыг тэмдэглэлд зөвшөөрнө', () {
      final m = Mistake.fromJson(const {'id': '1', 'problem': <String, Object?>{}, 'note': 'x', 'reason': 'CALC'});
      expect(m.copyWith(note: null).note, isNull);
      expect(m.copyWith(status: MistakeStatus.mastered).note, 'x');
      expect(m.copyWith().reason, MistakeReason.calc);
    });
  });

  group('давтлагын логик', () {
    test('сонголтын код', () {
      expect(choiceAnswerCode(ChoiceMode.text, 2), 'choice:2');
      expect(choiceAnswerCode(ChoiceMode.letter, 2), 'C');
      expect(choiceIndexOfCode(ChoiceMode.text, 'choice:3'), 3);
      expect(choiceIndexOfCode(ChoiceMode.letter, 'B'), 1);
      expect(choiceIndexOfCode(ChoiceMode.text, 'hello'), isNull);
      expect(choiceIndexOfCode(ChoiceMode.letter, 'AB'), isNull);
    });

    test('displayReviewAnswer', () {
      const src = StudySource(choiceMode: ChoiceMode.text, choices: [StudyChoice(text: r'$1$'), StudyChoice(text: r'$2$')]);
      expect(displayReviewAnswer(src, 'choice:1'), r'$2$');
      expect(displayReviewAnswer(src, ''), 'Хариулт бичээгүй');
      expect(displayReviewAnswer(src, '1/3'), '1/3');
    });

    test('correctnessLabel', () {
      expect(correctnessLabel(true), 'Зөв');
      expect(correctnessLabel(false), 'Буруу');
      expect(correctnessLabel(null), 'Үнэлгээ тодорхойгүй');
    });

    test('remainingSeconds: серверийн цагтай тэгшилж, төсвөөс хэтрүүлэхгүй', () {
      final deviceFetch = DateTime.utc(2026, 11, 2, 10, 0, 0);
      // Утасны цаг сервертэй 5 минут зөрүүтэй (сервер 10:05:00).
      final serverNow = DateTime.utc(2026, 11, 2, 10, 5, 0);
      final deadline = serverNow.add(const Duration(minutes: 10));
      int left(int sec) => remainingSeconds(
        deadlineAt: deadline,
        serverNow: serverNow,
        deviceNowAtFetch: deviceFetch,
        deviceNow: deviceFetch.add(Duration(seconds: sec)),
        budgetMinutes: 10,
      );
      expect(left(0), 600);
      expect(left(90), 510);
      expect(left(600), 0);
      expect(left(9999), 0);
      // Дуусах хугацаа буруугаар ирээдүйд хол байсан ч төсвөөс хэтрэхгүй.
      expect(
        remainingSeconds(
          deadlineAt: deadline.add(const Duration(days: 3)),
          serverNow: serverNow,
          deviceNowAtFetch: deviceFetch,
          deviceNow: deviceFetch,
          budgetMinutes: 10,
        ),
        600,
      );
      expect(formatCountdown(65), '1:05');
      expect(formatCountdown(0), '0:00');
    });

    test('newRequestId: UUID v4 хэлбэр, давхцахгүй', () {
      final a = newRequestId(Random(1));
      expect(a, matches(RegExp(r'^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')));
      expect(newRequestId(), isNot(newRequestId()));
    });

    test('StudyRun.fromJson', () {
      final r = StudyRun.fromJson(const {
        'id': 'r',
        'budgetMinutes': 30,
        'deadlineAt': '2026-11-02T10:00:00.000Z',
        'serverNow': '2026-11-02T09:00:00.000Z',
        'status': 'EXPIRED',
        'items': [
          {
            'id': 'i',
            'source': {'statement': 'x', 'choices': ['a', {'label': 'B', 'text': 'b'}], 'choiceMode': 'LETTER'},
            'first': {'answer': 'A', 'flags': ['guessed'], 'correct': false},
            'responses': [
              {'kind': 'FIRST', 'answer': 'A', 'correct': false, 'assistance': true},
            ],
          },
        ],
        'evidence': {'assigned': 5, 'answered': 3},
      });
      expect(r.isExpired, isTrue);
      expect(r.items.single.source.choices!.length, 2);
      expect(r.items.single.hasFirstAssistance, isTrue);
      expect(r.evidence.answered, 3);
      expect(r.items.single.solution, isNull);
    });
  });

  group('видео', () {
    test('youtubeId зөвхөн найдвартай HTTPS хостоос', () {
      expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
      expect(youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
      expect(youtubeId('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
      expect(youtubeId('http://www.youtube.com/watch?v=dQw4w9WgXcQ'), isNull);
      expect(youtubeId('https://evil.com/watch?v=dQw4w9WgXcQ'), isNull);
      expect(youtubeId('https://www.youtube.com.evil.com/watch?v=dQw4w9WgXcQ'), isNull);
      expect(youtubeId('https://user@www.youtube.com/watch?v=dQw4w9WgXcQ'), isNull);
      expect(youtubeId('https://www.youtube.com:444/watch?v=dQw4w9WgXcQ'), isNull);
      expect(youtubeId('https://www.youtube.com/watch?v=short'), isNull);
      expect(youtubeId('javascript:alert(1)'), isNull);
      expect(youtubeId(''), isNull);
    });

    test('playableUri: nocookie embed; өөр хостын embedUrl-ыг хүлээж авахгүй', () {
      final u = playableUri(source: 'https://youtu.be/dQw4w9WgXcQ');
      expect(u!.host, 'www.youtube-nocookie.com');
      expect(u.path, '/embed/dQw4w9WgXcQ');
      expect(playableUri(source: 'https://evil.com/x', embedUrl: 'https://evil.com/embed/dQw4w9WgXcQ'), isNull);
      expect(
        playableUri(source: '', embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=0')!.path,
        '/embed/dQw4w9WgXcQ',
      );
    });

    test('formatDuration', () => expect(formatDuration(605), '10:05'));
  });

  group('хичээл, томьёо, дасгал', () {
    test('номын нэр: displayName ?? title, code харагдахгүй', () {
      final c = LessonChapter.fromJson(const {
        'id': 'c',
        'title': 'Бүлэг',
        'book': {'code': 'SECRET-1', 'title': 'Ном', 'displayName': 'Үзүүлэх нэр'},
        'theoryCount': 2,
        'videoCount': 1,
        'theoriesRead': 5,
        'videosWatched': 0,
      });
      expect(c.bookName, 'Үзүүлэх нэр');
      expect(c.itemsDone, 2);
      expect(c.progress, closeTo(2 / 3, 1e-9));
      expect(LessonChapter.fromJson(const {'id': 'x', 'title': 't', 'book': {'code': 'C', 'title': 'Ном'}}).bookName, 'Ном');
    });

    test('groupByBook дарааллыг хадгална', () {
      final g = groupByBook([
        LessonChapter.fromJson(const {'id': '1', 'title': 'a', 'book': {'code': 'B', 'title': 'Б'}}),
        LessonChapter.fromJson(const {'id': '2', 'title': 'b', 'book': {'code': 'A', 'title': 'А'}}),
        LessonChapter.fromJson(const {'id': '3', 'title': 'c', 'book': {'code': 'B', 'title': 'Б'}}),
      ]);
      expect(g.map((e) => e.$1), ['Б', 'А']);
      expect(g.first.$2.length, 2);
    });

    test('filterFormulas', () {
      final all = [
        const FormulaSummary(slug: 'a', title: 'Квадрат', section: 's1', level: 'CORE'),
        const FormulaSummary(slug: 'b', title: 'Куб', section: 's2', level: 'EXTRA'),
      ];
      expect(filterFormulas(all, query: 'кв').length, 1);
      expect(filterFormulas(all, level: 'EXTRA').single.slug, 'b');
      expect(filterFormulas(all, section: 's1').single.slug, 'a');
      expect(filterFormulas(all).length, 2);
    });

    test('PracticeProblem: {label,text} ба string сонголт', () {
      final a = PracticeProblem.fromJson(const {
        'id': 'p',
        'format': 'CHOICE',
        'choices': [
          {'label': 'A', 'text': '1'},
          {'label': 'B', 'text': '2'},
        ],
      });
      expect(a.hasLabels, isTrue);
      final b = PracticeProblem.fromJson(const {'id': 'p', 'choices': ['1', '2']});
      expect(b.hasLabels, isFalse);
      expect(b.isChoice, isTrue);
      expect(AttemptResult.fromJson(const {'correct': null}).correct, isNull);
    });

    test('isMongolianText', () {
      expect(isMongolianText('Сул сэдэв'), isTrue);
      expect(isMongolianText('weak topic'), isFalse);
      expect(isMongolianText(null), isFalse);
    });
  });
}
