import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';

/// Түвшин тогтоох шалгалт (`api/src/placement`) — нэвтрэлтгүй, зочны эрх нь `start`-аас авсан нууц түлхүүр.
/// Хариуны түлхүүр апп руу ирэхгүй (дүнг сервер тооцно, багш бодолтыг үзнэ).

const placementChoiceKeys = ['A', 'B', 'C', 'D', 'E'];

/// Нэг бодлогод хамгийн ихдээ (серверийн `MAX_PHOTOS_PER_PROBLEM`, вэб ч 3).
const placementMaxPhotos = 3;

@immutable
class PlacementBox {
  const PlacementBox({required this.key, required this.digits});

  final String key;
  final int digits;
}

@immutable
class PlacementProblem {
  const PlacementProblem({
    required this.n,
    required this.statement,
    required this.kind,
    this.choices = const {},
    this.boxes = const [],
    this.points = 1,
  });

  factory PlacementProblem.fromJson(Map<String, Object?> j) {
    final ch = j['choices'];
    return PlacementProblem(
      n: (j['n'] as num?)?.toInt() ?? 0,
      statement: j['statement'] as String? ?? '',
      kind: j['kind'] == 'boxes' ? 'boxes' : 'choice',
      choices: {
        if (ch is Map)
          for (final k in placementChoiceKeys)
            if (ch[k] is String) k: ch[k] as String,
      },
      boxes: [
        for (final b in (j['boxes'] as List? ?? const []))
          if (b is Map && b['key'] is String)
            PlacementBox(key: b['key'] as String, digits: (b['digits'] as num?)?.toInt() ?? 1),
      ],
      points: (j['points'] as num?) ?? 1,
    );
  }

  final int n;
  final String statement;

  /// `choice` | `boxes`
  final String kind;
  final Map<String, String> choices;
  final List<PlacementBox> boxes;
  final num points;

  bool get isChoice => kind == 'choice';
}

@immutable
class PlacementTest {
  const PlacementTest({
    required this.title,
    required this.minutes,
    required this.instructions,
    required this.problems,
  });

  factory PlacementTest.fromJson(Object? json) {
    final j = (json! as Map).cast<String, Object?>();
    return PlacementTest(
      title: j['title'] as String? ?? 'Түвшин шалгах тест',
      minutes: (j['minutes'] as num?)?.toInt() ?? 0,
      instructions: [
        for (final l in (j['instructions'] as String? ?? '').split('\n'))
          if (l.trim().isNotEmpty) l.trim(),
      ],
      problems: [
        for (final p in (j['problems'] as List? ?? const []))
          if (p is Map) PlacementProblem.fromJson(p.cast<String, Object?>()),
      ],
    );
  }

  final String title;
  final int minutes;
  final List<String> instructions;
  final List<PlacementProblem> problems;
}

/// Хариу: сонголттой бол «A», нүдтэй бол `{a: '1', b: '2'}`.
typedef PlacementAnswers = Map<String, Object>;
typedef PlacementPhotos = Map<String, List<String>>;

PlacementAnswers parsePlacementAnswers(Object? raw) => {
      if (raw is Map)
        for (final e in raw.entries)
          if (e.value is String)
            e.key.toString(): e.value as String
          else if (e.value is Map)
            e.key.toString(): {
              for (final b in (e.value as Map).entries)
                if (b.value is String) b.key.toString(): b.value as String,
            },
    };

PlacementPhotos parsePlacementPhotos(Object? raw) => {
      if (raw is Map)
        for (final e in raw.entries)
          if (e.value is List) e.key.toString(): [for (final k in e.value as List) if (k is String) k],
    };

/// Хариулсан эсэх (вэбийн `isAnswered`): нүдтэй бол бүх нүд бөглөгдсөн.
bool placementAnswered(PlacementProblem p, PlacementAnswers a) {
  final v = a['${p.n}'];
  if (p.isChoice) return v is String && v.isNotEmpty;
  return v is Map && p.boxes.every((b) => (v[b.key] as String? ?? '').isNotEmpty);
}

/// Төхөөрөмжид хадгалах эхэлсэн шалгалт (апп хаагдвал үргэлжилнэ).
@immutable
class PlacementAttempt {
  const PlacementAttempt({required this.id, required this.secret, required this.deadline});

  static PlacementAttempt? fromJson(Object? j) {
    if (j is! Map) return null;
    final id = j['id'], secret = j['secret'], deadline = j['deadline'];
    if (id is! String || secret is! String || deadline is! int) return null;
    return PlacementAttempt(id: id, secret: secret, deadline: DateTime.fromMillisecondsSinceEpoch(deadline, isUtc: true));
  }

  final String id;
  final String secret;
  final DateTime deadline;

  Map<String, Object> toJson() => {'id': id, 'secret': secret, 'deadline': deadline.millisecondsSinceEpoch};

  PlacementAttempt withDeadline(DateTime d) => PlacementAttempt(id: id, secret: secret, deadline: d);
}

/// Зочны түлхүүр — хувийн мэдээлэлтэй адил secure storage-д.
abstract class PlacementAttemptStore {
  Future<PlacementAttempt?> read();
  Future<void> write(PlacementAttempt? attempt);
}

class SecurePlacementAttemptStore implements PlacementAttemptStore {
  SecurePlacementAttemptStore([FlutterSecureStorage? s]) : _s = s ?? const FlutterSecureStorage();

  final FlutterSecureStorage _s;
  static const _key = 'pm_placement_attempt_v1';

  @override
  Future<PlacementAttempt?> read() async {
    try {
      final raw = await _s.read(key: _key);
      return raw == null ? null : PlacementAttempt.fromJson(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> write(PlacementAttempt? attempt) async {
    try {
      if (attempt == null) {
        await _s.delete(key: _key);
      } else {
        await _s.write(key: _key, value: jsonEncode(attempt.toJson()));
      }
    } catch (_) {
      // Хадгалж чадаагүй ч шалгалт үргэлжилнэ (зөвхөн дахин нээхэд үргэлжлэхгүй).
    }
  }
}

class MemoryPlacementAttemptStore implements PlacementAttemptStore {
  MemoryPlacementAttemptStore([this.value]);

  PlacementAttempt? value;

  @override
  Future<PlacementAttempt?> read() async => value;

  @override
  Future<void> write(PlacementAttempt? attempt) async => value = attempt;
}

final placementAttemptStoreProvider = Provider<PlacementAttemptStore>((ref) => SecurePlacementAttemptStore());

/// `POST /placement/start` маягт.
@immutable
class PlacementStartForm {
  const PlacementStartForm({required this.name, required this.phone, required this.grade, this.school = '', this.parentPhone = ''});

  final String name;
  final String phone;
  final int grade;
  final String school;
  final String parentPhone;

  Map<String, Object?> toJson() => {
        'name': name.trim(),
        'phone': phone.replaceAll(RegExp(r'\s+'), ''),
        'grade': grade,
        if (school.trim().isNotEmpty) 'school': school.trim(),
        if (parentPhone.trim().isNotEmpty) 'parentPhone': parentPhone.replaceAll(RegExp(r'\s+'), ''),
      };
}

/// Эхлэхийн өмнөх шалгалт (вэбийн `Intro.start`). Алдаагүй бол null.
String? validatePlacementStart({required String name, required String phone, required int? grade, String parentPhone = ''}) {
  final digits8 = RegExp(r'^[0-9]{8}$');
  if (name.trim().length < 2) return 'Нэрээ бүтэн бичнэ үү';
  if (!digits8.hasMatch(phone.replaceAll(RegExp(r'\s+'), ''))) return 'Утасны дугаар 8 оронтой байх ёстой';
  if (grade == null) return 'Ангиа сонгоно уу';
  final pp = parentPhone.replaceAll(RegExp(r'\s+'), '');
  if (pp.isNotEmpty && !digits8.hasMatch(pp)) return 'Эцэг эхийн утас 8 оронтой байх ёстой';
  return null;
}

@immutable
class PlacementResume {
  const PlacementResume({required this.test, required this.answers, required this.photos, required this.submitted, this.deadlineAt});

  final PlacementTest test;
  final PlacementAnswers answers;
  final PlacementPhotos photos;
  final bool submitted;
  final DateTime? deadlineAt;
}

class PlacementRepository {
  const PlacementRepository(this._api);

  final ApiClient _api;

  static String _p(String id) => '/placement/${Uri.encodeComponent(id)}';

  Future<PlacementTest> test() => _api.get('/placement/test', auth: false, parse: PlacementTest.fromJson);

  /// Эхлүүлнэ. Хугацааг төхөөрөмжийн цагаар бус серверийн `deadlineAt`-аар (байхгүй бол минутаар).
  Future<(PlacementAttempt, PlacementTest)> start(PlacementStartForm form) => _api.post(
        '/placement/start',
        body: form.toJson(),
        auth: false,
        parse: (j) {
          final m = (j! as Map).cast<String, Object?>();
          final test = PlacementTest.fromJson(m['test']);
          final deadline = DateTime.tryParse(m['deadlineAt'] as String? ?? '')?.toUtc() ??
              DateTime.now().toUtc().add(Duration(minutes: test.minutes));
          return (PlacementAttempt(id: m['id']! as String, secret: m['secret']! as String, deadline: deadline), test);
        },
      );

  Future<PlacementResume> resume(PlacementAttempt a) => _api.post(
        '${_p(a.id)}/resume',
        body: {'secret': a.secret},
        auth: false,
        retry: true,
        parse: (j) {
          final m = (j! as Map).cast<String, Object?>();
          return PlacementResume(
            test: PlacementTest.fromJson(m['test']),
            answers: parsePlacementAnswers(m['answers']),
            photos: parsePlacementPhotos(m['photos']),
            submitted: m['submittedAt'] != null,
            deadlineAt: DateTime.tryParse(m['deadlineAt'] as String? ?? '')?.toUtc(),
          );
        },
      );

  /// Хариу хадгалах — ижил хариуг давтан илгээхэд аюулгүй.
  Future<void> save(PlacementAttempt a, PlacementAnswers answers) =>
      _api.put<Object?>('${_p(a.id)}/answers', body: {'secret': a.secret, 'answers': answers}, auth: false, retry: true);

  Future<void> submit(PlacementAttempt a, PlacementAnswers answers, {required bool auto}) => _api.post<Object?>(
        '${_p(a.id)}/submit',
        body: {'secret': a.secret, 'answers': answers, 'auto': auto},
        auth: false,
      );

  /// Бодолтын зураг (multipart: `secret`, `problem`, `file`) — токенгүй.
  Future<(String, PlacementPhotos)> addPhoto(PlacementAttempt a, int problem, Uint8List bytes) async {
    // Талбаруудыг файлаас ӨМНӨ — multer body-г файлын өмнөх талбараас уншина.
    final form = FormData()
      ..fields.add(MapEntry('secret', a.secret))
      ..fields.add(MapEntry('problem', '$problem'))
      ..files.add(
        MapEntry('file', MultipartFile.fromBytes(bytes, filename: 'bodolt.jpg', contentType: DioMediaType.parse('image/jpeg'))),
      );
    try {
      final res = await _api.dio.post<Object?>(
        '${_p(a.id)}/photos',
        data: form,
        options: Options(
          validateStatus: (_) => true,
          sendTimeout: const Duration(seconds: 60),
          receiveTimeout: const Duration(seconds: 60),
        ),
      );
      final status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) throw ApiError.fromStatus(status, res.data);
      final m = (res.data! as Map).cast<String, Object?>();
      return (m['key']! as String, parsePlacementPhotos(m['photos']));
    } on DioException catch (e) {
      throw ApiError.fromDio(e);
    }
  }

  Future<PlacementPhotos> removePhoto(PlacementAttempt a, String key) => _api.delete(
        '${_p(a.id)}/photos/${Uri.encodeComponent(key)}',
        body: {'secret': a.secret},
        auth: false,
        parse: (j) => parsePlacementPhotos((j as Map?)?['photos']),
      );
}

final placementRepositoryProvider = Provider<PlacementRepository>((ref) => PlacementRepository(ref.watch(apiClientProvider)));
