import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import '../../payments/data/ledger.dart';
import '../../payments/data/payments_repository.dart';
import 'reconcile_models.dart';

/// Банкны хуулга (`/reconcile/*`). Эрх: ADMIN, TEACHER_PLUS + `finance.manage` (серверт).
///
/// Мутаци (хуваарилах, буцаах, шийтэд хөтлөгдсөн өдөр, хуулга) ХЭЗЭЭ Ч автоматаар давтагдахгүй. Тэдгээр нь
/// хүүхдийн төлбөрийг өөрчилдөг тул `/payments` кэшийг гараар цэвэрлэнэ (`/reconcile` нь өөрөө цэвэрлэгдэнэ).
class ReconcileRepository {
  ReconcileRepository(this._api, this._payments);

  final ApiClient _api;
  final PaymentsRepository _payments;

  static const pageSize = 50;

  /// Багш+-ын санхүүгийн эрх (`GET /staff-capabilities/me`) — бүх ангид олгогдсон `finance.manage`.
  Future<bool> hasFinanceCapability() => _api.get(
    '/staff-capabilities/me',
    parse: (j) {
      final m = j is Map ? j : const <String, Object?>{};
      if (m['administrator'] == true) return true;
      return [
        for (final g in (m['grants'] as List?) ?? const [])
          if (g is Map) g,
      ].any((g) => g['capability'] == 'finance.manage' && (g['scopeKey'] == null || g['scopeKey'] == ''));
    },
  );

  /// `GET /reconcile/overview` — курсор, жагсаалт бүрийн тоо.
  Future<ReconcileOverview> overview() => _api.get('/reconcile/overview', parse: ReconcileOverview.fromJson);

  /// `GET /reconcile/rows` — хамгийн сүүлийн гүйлгээ дээр. [query] нь утга эсвэл дүн. [checkOnly] —
  /// «Шийтэд хөтлөгдсөн»-өөс зөвхөн шийтэд баталгаажаагүй.
  Future<RowPage> rows({
    required Lane lane,
    String query = '',
    bool checkOnly = false,
    int offset = 0,
    int limit = pageSize,
  }) => _api.get(
    '/reconcile/rows',
    query: {
      'lane': lane.api,
      'limit': '${limit.clamp(1, 200)}',
      'offset': '$offset',
      if (lane == Lane.sheet && checkOnly) 'check': '1',
      if (query.trim().isNotEmpty) 'q': query.trim(),
    },
    parse: RowPage.fromJson,
  );

  /// `GET /reconcile/students?q=` — нэр, овог эсвэл утасны хэсгээр (2-оос дээш тэмдэгт).
  Future<List<StudentCard>> searchStudents(String q) async {
    final t = q.trim();
    if (t.length < 2) return const [];
    return _api.get(
      '/reconcile/students',
      query: {'q': t},
      parse: (j) => [
        for (final s in (j is Map && j['items'] is List ? j['items'] as List : const <Object?>[]))
          StudentCard.fromJson(s),
      ],
    );
  }

  /// `GET /reconcile/students/:id` — «⋯» дэлгэрэнгүй (утас, хуулгаас оноосон гүйлгээ, сурсан данс).
  Future<StudentDetail> studentDetail(String id) =>
      _api.get('/reconcile/students/${Uri.encodeComponent(id)}', parse: StudentDetail.fromJson);

  /// Сарын блок. Анги оноогдоогүй гэх мэтээр алдаа гарвал `null` — бусад мэдээлэл харагдана (вэбтэй ижил).
  Future<StudentLedger?> studentLedger(String id) async {
    try {
      return await _payments.ledgerStudent(id);
    } on ApiError {
      return null;
    }
  }

  /// `POST /reconcile/rows/:id/allocate` — нийлбэр нь гүйлгээний дүнтэй тэнцүү эсэхийг сервер шалгана.
  Future<AllocateResult> allocate(String rowId, List<AllocPart> parts) async {
    final res = await _api.post(
      '/reconcile/rows/${Uri.encodeComponent(rowId)}/allocate',
      body: {
        'parts': [for (final p in parts) p.toJson()],
      },
      parse: AllocateResult.fromJson,
    );
    _api.invalidateCache('/payments');
    return res;
  }

  /// `POST /reconcile/rows/:id/undo` — хуваарилалтыг буцаах. Сервер устгахгүй: хэсгүүдийг цуцалж
  /// (`revokedAt`), хуулгаас үүссэн төлбөрийг REVERSED болгож, аудитад бичнэ.
  Future<void> undo(String rowId) async {
    await _api.post<Object?>('/reconcile/rows/${Uri.encodeComponent(rowId)}/undo');
    _api.invalidateCache('/payments');
  }

  /// `POST /reconcile/sheet-through` — «энэ өдрийг хүртэл ажилтан шийтэд хөтөлсөн». Шилжүүлсэн тоо.
  Future<int> markSheetThrough(String through) => _api.post(
    '/reconcile/sheet-through',
    body: {'through': through},
    parse: (j) => j is Map && j['marked'] is num ? (j['marked']! as num).toInt() : 0,
  );

  /// Банкны хуулга оруулах (multipart `file`, зөвхөн Хаан банкны .xlsx).
  Future<ImportSummary> importStatement(Uint8List bytes, StatementPreview file) async {
    final form = FormData()
      ..files.add(
        MapEntry(
          'file',
          MultipartFile.fromBytes(
            bytes,
            filename: file.name,
            contentType: DioMediaType.parse(StatementPreview.mimeType),
          ),
        ),
      );
    try {
      final res = await _api.dio.post<Object?>(
        '/reconcile/import',
        data: form,
        options: Options(
          headers: _api.authHeaders(),
          validateStatus: (_) => true,
          sendTimeout: const Duration(seconds: 90),
          receiveTimeout: const Duration(seconds: 90),
        ),
      );
      final status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) throw ApiError.fromStatus(status, res.data);
      _api
        ..invalidateCache('/reconcile')
        ..invalidateCache('/payments');
      return ImportSummary.fromJson(res.data);
    } on DioException catch (e) {
      throw ApiError.fromDio(e);
    }
  }
}

final reconcileRepositoryProvider = Provider<ReconcileRepository>(
  (ref) => ReconcileRepository(ref.watch(apiClientProvider), ref.watch(paymentsRepositoryProvider)),
);
