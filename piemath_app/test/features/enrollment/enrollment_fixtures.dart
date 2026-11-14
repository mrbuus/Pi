import '../../helpers/fake_http.dart';

/// Элсэлтийн зохиомол өгөгдөл (жинхэнэ хүний нэр, утас биш).
/// 2026-11-10 10:00 UB (02:00 UTC).
final enrollmentNow = DateTime.utc(2026, 11, 10, 2);

// Серверийн эрэмбэ санаатайгаар холимог — апп Математик, Нийгэм судлал, SAT дарааллаар харуулна.
const windowsJson = [
  {'subject': 'SAT', 'status': 'COMING_SOON', 'availability': 'ONLINE_ONLY', 'note': null},
  {'subject': 'MATH', 'status': 'OPEN', 'availability': 'BOTH', 'note': '12-р анги дүүрсэн'},
  {'subject': 'SOCIAL_STUDIES', 'status': 'CLOSED', 'availability': 'CLASSROOM_ONLY', 'note': null},
  {'subject': 'UNKNOWN', 'status': 'OPEN', 'availability': 'BOTH'},
];

const unassignedJson = [
  {
    'id': 's1',
    'firstName': 'Тэмүүлэн',
    'lastName': 'Бат',
    'phone': '99001122',
    'studentProfile': {'grade': 11, 'school': '1-р сургууль'},
    'waitingSince': '2026-11-07T01:00:00.000Z',
  },
];

const pendingJson = [
  {
    'id': 'p1',
    'firstName': 'Сараа',
    'lastName': 'Дорж',
    'phone': '88001122',
    'grade': 10,
    'registeredAt': '2026-11-08T03:00:00.000Z',
    'hasConfirmedPayment': true,
  },
];

const unverifiedJson = [
  {'id': 'x1', 'firstName': 'Болд', 'lastName': 'Ганаа', 'email': 'bold@test.mn', 'createdAt': '2026-11-01T00:00:00.000Z'},
  {
    'id': 'x2',
    'firstName': 'Нараа',
    'lastName': 'Төмөр',
    'email': 'naraa@test.mn',
    'organization': 'Тест сургууль',
    'rejectionReason': 'Мэдээлэл дутуу',
  },
];

const verifiedJson = [
  {
    'id': 'x3',
    'firstName': 'Оюун',
    'lastName': 'Бат',
    'email': 'oyun@test.mn',
    'verifiedAt': '2026-10-20T00:00:00.000Z',
    'groupCount': 3,
    'note': 'Шалгасан',
  },
];

const passesJson = [
  {'id': 'pass2', 'name': 'Сарын эрх', 'durationDays': 30, 'price': 120000},
  {'id': 'pass1', 'name': 'Долоо хоногийн эрх', 'durationDays': 7},
];

FakeHttp enrollmentHttp() => FakeHttp()
  ..json('GET', '/enrollment-windows', windowsJson)
  ..on('PATCH', '/enrollment-windows/MATH', (r) {
    final b = (r.data as Map).cast<String, Object?>();
    return FakeResponse({
      'subject': 'MATH',
      'status': b['status'] ?? 'OPEN',
      'availability': b['availability'] ?? 'BOTH',
      'note': b['note'] ?? '12-р анги дүүрсэн',
    });
  })
  ..json('GET', '/classrooms/unassigned-students', unassignedJson)
  ..json('GET', '/users/students/pending-approval', pendingJson)
  ..json('POST', '/users/students/p1/approve', {'ok': true})
  ..json('GET', '/teacher-groups/unverified', unverifiedJson)
  ..json('GET', '/teacher-groups/verified', verifiedJson)
  ..json('PUT', '/teacher-groups/verify/x1', {'ok': true})
  ..json('PUT', '/teacher-groups/reject/x1', {'ok': true})
  ..json('PUT', '/teacher-groups/reconsider/x2', {'ok': true})
  ..json('PUT', '/teacher-groups/unverify/x3', {'ok': true})
  ..json('GET', '/catalog/passes', passesJson)
  ..json('POST', '/passes/pass1/grant', {'ok': true})
  ..json('GET', '/staff-capabilities/me', {
    'administrator': false,
    'grants': [
      {'capability': 'finance.manage', 'scopeKey': null},
    ],
  });

Map<String, Object?> requestJson(FakeHttp http, String method, String path) =>
    ((http.requests.lastWhere((r) => r.method == method && r.path == path).data as Map?) ?? const {}).cast();
