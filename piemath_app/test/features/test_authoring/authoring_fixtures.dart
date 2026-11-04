import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/test_authoring/data/authoring_storage.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

/// Зохиомол өгөгдөл (жинхэнэ сурагч, багшийн мэдээлэл биш). Математикийн бичвэр LaTeX, үржих `\cdot`.

Map<String, Object?> choiceProblemJson({
  String id = 'p1',
  String token = '100-23-05',
  int version = 3,
  int correct = 1,
  int points = 1,
  String statement = r'Тэгшитгэлийн их шийдийг ол: $x^2-5x+6=0$',
}) => {
  'id': id,
  'token': token,
  'format': 'CHOICE',
  'statementText': statement,
  'imageKey': null,
  'choices': null,
  'correctAnswer': '3',
  'points': points,
  'chapterId': 'ch1',
  'version': version,
  'choiceOptions': [
    for (var i = 0; i < 5; i++)
      {'order': i + 1, 'text': '\$${i + 2}\$', 'isCorrect': i == correct, 'label': 'ABCDE'[i], 'imageKey': null},
  ],
  'tags': [
    {
      'tag': {'id': 't1', 'type': 'TOPIC', 'name': 'Квадрат тэгшитгэл'},
    },
  ],
  'analysis': {'answerKeyStatus': 'VERIFIED', 'topic': 'Алгебр', 'subtopic': null},
};

Map<String, Object?> fillProblemJson({String id = 'p2', String token = '100-23-06', Object? answer = '325'}) => {
  'id': id,
  'token': token,
  'format': 'FILL_NUMBER',
  'statementText': r'$2\cdot x=6$ бол $x=[a]$, $y=[bc]$',
  'imageKey': null,
  'correctAnswer': answer,
  'points': 2,
  'chapterId': 'ch1',
  'version': 1,
  'choiceOptions': <Object>[],
  'tags': <Object>[],
  'analysis': null,
};

Map<String, Object?> testJson({
  String id = 'tst1',
  String type = 'CHAPTER_EXAM',
  int version = 7,
  String? chapterId = 'ch1',
  List<Map<String, Object?>>? problems,
  List<String> classes = const ['c1'],
  String createdById = 'u1',
}) {
  final rows = problems ?? [choiceProblemJson(), fillProblemJson()];
  return {
    'id': id,
    'title': 'Илтгэгч тэгшитгэл 1',
    'type': type,
    'gradingMode': 'AUTO',
    'chapterId': chapterId,
    'timeLimitMin': 40,
    'groupKey': null,
    'variantLabel': 'A',
    'pdfKey': null,
    'price': null,
    'version': version,
    'isDraft': false,
    'createdById': createdById,
    'chapter': {
      'book': {'subject': 'MATH'},
    },
    'problems': [
      for (var i = 0; i < rows.length; i++)
        {'problemId': rows[i]['id'], 'order': i + 1, 'points': rows[i]['points'], 'problem': rows[i]},
    ],
    'access': [
      for (final c in classes) {'classroomId': c},
    ],
  };
}

const classroomsJson = [
  {
    'id': 'c1',
    'name': '12А анги',
    'grade': 12,
    'subject': null,
    '_count': {'enrollments': 18},
  },
  {
    'id': 'c2',
    'name': '11Б анги',
    'grade': 11,
    'subject': 'SOCIAL_STUDIES',
    '_count': {'enrollments': 12},
  },
];

const chaptersJson = [
  {
    'id': 'ch1',
    'title': 'Илтгэгч тэгшитгэл',
    'grade': 12,
    'book': {'code': '100', 'title': '100x100'},
    '_count': {'problems': 40, 'theories': 2},
  },
  {
    'id': 'ch2',
    'title': 'Логарифм',
    'grade': 12,
    'book': {'code': '200', 'title': '200x200'},
    '_count': {'problems': 30, 'theories': 1},
  },
];

/// Бүлгийн бодлогууд: [choice] сонгох, [fill] нөхөх.
List<Map<String, Object?>> chapterProblemsJson({int choice = 3, int fill = 1}) => [
  for (var i = 0; i < choice; i++) choiceProblemJson(id: 'b$i', token: '100-30-${10 + i}'),
  for (var i = 0; i < fill; i++) fillProblemJson(id: 'f$i', token: '100-31-${10 + i}'),
];

/// Ажилтны дэлгэцийг зурна (`pumpM7` + нооргийн заагч санах ойд).
Future<void> pumpAuthoring(
  WidgetTester tester,
  Widget screen, {
  required FakeHttp http,
  String role = 'TEACHER_PLUS',
  DraftPointerStore? store,
  Size size = const Size(390, 844),
}) => pumpM7(
  tester,
  screen,
  http: http,
  session: signedInAs(role),
  size: size,
  extra: [draftPointerStoreProvider.overrideWithValue(store ?? MemoryDraftPointerStore())],
);
