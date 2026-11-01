// Зохиомол өгөгдөл (api-contract-ийн бүтцээр) — жинхэнэ сурагчийн нэр, утас биш.

Map<String, Object?> verifiedLink({String id = 'lnk1', String studentId = 's1', String type = 'CLASSROOM'}) => {
      'id': id,
      'verifiedAt': '2026-09-01T03:00:00.000Z',
      'verified': true,
      'student': {
        'id': studentId,
        'firstName': 'Тэмүүлэн',
        'lastName': 'Тестийн',
        'phone': '99000001',
        'studentProfile': {'grade': 12, 'school': 'Жишээ сургууль', 'type': type},
        'classroom': {'id': 'cls1', 'name': '12Б', 'grade': 12},
        'attendances': [
          {'date': '2026-11-02T00:00:00.000Z', 'status': 'PRESENT', 'classroom': {'name': '12Б'}},
          {'date': '2026-10-30T00:00:00.000Z', 'status': 'LATE', 'classroom': {'name': '12Б'}},
          {'date': '2026-10-28T00:00:00.000Z', 'status': 'ABSENT', 'classroom': {'name': '12Б'}},
        ],
        'dailyHomeworkMarks': type == 'CLASSROOM'
            ? [
                {'date': '2026-11-02T00:00:00.000Z', 'status': 'DONE', 'comment': null, 'classroom': {'name': '12Б'}},
                {'date': '2026-10-30T00:00:00.000Z', 'status': 'PARTIAL', 'comment': 'Хоёр бодлого дутуу', 'classroom': {'name': '12Б'}},
              ]
            : <Object?>[],
        'submissions': type == 'ONLINE'
            ? [
                {
                  'id': 'sub1',
                  'state': 'SUBMITTED',
                  'imageKeys': ['k1.jpg'],
                  'submittedAt': '2026-11-01T05:00:00.000Z',
                  'checkedAt': null,
                  'assignment': {'title': 'Логарифмын даалгавар', 'dueDate': '2026-11-02T00:00:00.000Z', 'classroom': {'name': 'Онлайн 12'}},
                },
              ]
            : <Object?>[],
        'testResults': [
          {
            'id': 'tr1',
            'totalScore': 31,
            'maxScore': 40,
            'source': 'ONLINE_TEST',
            'createdAt': '2026-10-31T06:00:00.000Z',
            'test': {'title': 'ЭЕШ жишиг · Сорил 3', 'type': 'EESH_MOCK'},
            'acknowledgements': <Object?>[],
          },
          {
            'id': 'tr0',
            'totalScore': 28,
            'maxScore': 40,
            'source': 'CHAPTER_EXAM',
            'createdAt': '2026-10-20T06:00:00.000Z',
            'test': {'title': 'Интеграл', 'type': 'CLASS'},
            'acknowledgements': [
              {'verifiedAt': '2026-10-21T02:00:00.000Z'},
            ],
          },
        ],
        'payments': [
          {'id': 'pay1', 'status': 'CONFIRMED', 'amount': 350000, 'createdAt': '2026-10-01T02:00:00.000Z'},
        ],
      },
    };

Map<String, Object?> pendingLink() => {
      'id': 'lnk2',
      'verifiedAt': null,
      'verified': false,
      'studentId': 's2',
      'student': {'id': 's2', 'firstName': 'Ану', 'lastName': 'Жишээ', 'phone': '88000002'},
    };

Map<String, Object?> examCard({bool acknowledged = false}) => {
      'testResultId': 'tr1',
      'test': {'title': 'ЭЕШ жишиг · Сорил 3', 'type': 'EESH_MOCK'},
      'totalScore': 31,
      'maxScore': 40,
      'percent': 78,
      'parts': {'part1': 24, 'part1Max': 28, 'part2': 7, 'part2Max': 12},
      'weakTopics': [
        {'name': 'Интеграл', 'percent': 40},
        {'name': 'Магадлал', 'percent': 25},
      ],
      'takenAt': '2026-10-31T06:00:00.000Z',
      'acknowledgedAt': acknowledged ? '2026-11-01T02:00:00.000Z' : null,
      'canAcknowledge': true,
    };

Map<String, Object?> weeklyReportJson() => {
      'student': {'id': 's1', 'firstName': 'Тэмүүлэн', 'lastName': 'Тестийн'},
      'week': {'start': '2026-11-02', 'end': '2026-11-08'},
      'attendance': {'present': 3, 'absent': 0, 'excused': 1},
      'tests': [
        {'title': 'Сорил 3', 'score': 31, 'maxScore': 40, 'createdAt': '2026-11-03T06:00:00.000Z'},
        {'title': 'Ангийн тест', 'score': null, 'maxScore': null, 'createdAt': '2026-11-03T06:00:00.000Z'},
      ],
      'testResultsComplete': true,
      'testResultLimit': null,
      'snapshotAt': '2026-11-04T02:00:00.000Z',
      'practiceCount': 42,
      'homework': {
        'assignments': {'done': 2, 'notDone': 1, 'items': <Object?>[]},
        'dailyMarks': {'done': 2, 'partial': 1, 'notDone': 0, 'unmarked': 1},
      },
      'topics': {
        'best': {'topic': 'Интеграл', 'total': 20, 'correct': 18, 'rate': 0.9},
        'weakest': null,
        'complete': true,
        'sampleLimit': null,
      },
      'nextWeekSchedule': [
        {'date': '2026-11-09', 'startMinute': 900, 'endMinute': 1020, 'room': '501', 'classroom': '12Б'},
      ],
    };

Map<String, Object?> notification(String id, {bool read = false, String? link, String kind = 'HOMEWORK'}) => {
      'id': id,
      'kind': kind,
      'title': 'Шинэ даалгавар $id',
      'body': 'Логарифмын 5 бодлого',
      'link': link,
      'readAt': read ? '2026-11-03T02:00:00.000Z' : null,
      'createdAt': '2026-11-04T01:55:00.000Z',
    };

List<Map<String, Object?>> myPayments() => [
      {
        'id': 'p1',
        'amount': 350000,
        'method': 'BANK_TRANSFER',
        'status': 'CONFIRMED',
        'description': null,
        'forMonth': '2026-10',
        'paidAt': '2026-10-02T03:00:00.000Z',
        'createdAt': '2026-10-02T03:00:00.000Z',
        'qpayInvoiceId': 'дотоод',
      },
      {
        'id': 'p2',
        'amount': 350000,
        'method': 'QPAY',
        'status': 'PENDING',
        'description': 'Арваннэгдүгээр сар',
        'forMonth': '2026-11',
        'paidAt': null,
        'createdAt': '2026-11-03T03:00:00.000Z',
      },
      {
        'id': 'p3',
        'amount': 300000,
        'method': 'CASH',
        'status': 'REVERSED',
        'description': null,
        'forMonth': null,
        'paidAt': '2026-10-15T03:00:00.000Z',
        'createdAt': '2026-10-15T03:00:00.000Z',
      },
    ];
