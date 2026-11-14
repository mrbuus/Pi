import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:file_selector/file_selector.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/cache/keep_alive.dart';
import '../../../core/cache/swr.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import '../domain/paper_exam_logic.dart';
import 'paper_exam_models.dart';

String _enc(String v) => Uri.encodeComponent(v);

/// `api/src/paper-exams` — эрх серверт: жагсаалт, хүснэгт — Админ, Багш+, Багш (өөрийн анги);
/// үүсгэх, нийтлэх, устгах (зөөлөн, `deletedAt`), импорт, буцаах (зөөлөн, `supersededAt`), холбох —
/// Багш+, Админ; `my`, `my/:id` — сурагч өөрийнхөө (id нь токеноос).
class PaperExamsRepository {
  const PaperExamsRepository(this._api);

  final ApiClient _api;

  static const _base = '/paper-exams';

  Future<List<PaperExamRow>> list() =>
      _api.get(_base, parse: (j) => [for (final e in _asList(j)) PaperExamRow.fromJson(e)]);

  Future<PaperBoard> board(String id) => _api.get('$_base/${_enc(id)}', parse: PaperBoard.fromJson);

  Future<String> create({required String title, required String heldOn, required int itemCount}) => _api.post(
    _base,
    body: {'title': title, 'heldOn': heldOn, 'itemCount': itemCount},
    parse: (j) => j is Map ? (j['id'] as String? ?? '') : '',
  );

  Future<void> setPublished(String id, bool published) =>
      _api.patch<Object?>('$_base/${_enc(id)}', body: {'published': published});

  /// Зөөлөн устгал — жагсаалтаас хасагдаж, сурагчдад харагдахаа болино.
  Future<void> remove(String id) => _api.delete<Object?>('$_base/${_enc(id)}');

  Future<List<ImportHistoryRow>> imports(String id) => _api.get(
    '$_base/${_enc(id)}/imports',
    parse: (j) => [for (final e in _asList(j)) ImportHistoryRow.fromJson(e)],
    cache: false,
  );

  /// Импортыг буцаах — энэ файлаар орсон хуудас хүчингүй болж, орлосон хуучин хуудас сэргэнэ (устахгүй).
  Future<void> revertImport(String importId) =>
      _api.post<Object?>('$_base/imports/${_enc(importId)}/revert', body: const <String, Object?>{});

  Future<void> linkSheet(String sheetId, String? studentId) =>
      _api.patch<Object?>('$_base/sheets/${_enc(sheetId)}', body: {'studentId': studentId});

  Future<List<FoundStudent>> searchStudents(String q) => _api.get(
    '$_base/students/search',
    query: {'q': q},
    parse: (j) => [for (final e in _asList(j)) FoundStudent.fromJson(e)],
    cache: false,
  );

  /// Excel (.xlsx) оруулах: [confirm] = false бол зөвхөн урьдчилан харна (санд бичихгүй).
  Future<ImportPreview> importFile(
    String examId, {
    required String fileName,
    required Uint8List bytes,
    required bool confirm,
    required bool replace,
  }) async {
    final form = FormData()
      ..files.add(
        MapEntry(
          'file',
          MultipartFile.fromBytes(
            bytes,
            filename: fileName,
            contentType: DioMediaType.parse('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
          ),
        ),
      );
    try {
      final res = await _api.dio.post<Object?>(
        '$_base/${_enc(examId)}/import',
        data: form,
        queryParameters: {'confirm': confirm ? '1' : '0', 'replace': replace ? '1' : '0'},
        options: Options(
          headers: _api.authHeaders(),
          validateStatus: (_) => true,
          sendTimeout: const Duration(seconds: 90),
          receiveTimeout: const Duration(seconds: 90),
        ),
      );
      final status = res.statusCode ?? 0;
      if (status < 200 || status >= 300) throw ApiError.fromStatus(status, res.data);
      if (confirm) _api.invalidateCache(_base);
      return ImportPreview.fromJson(res.data);
    } on DioException catch (e) {
      throw ApiError.fromDio(e);
    }
  }

  Future<List<MyPaperExam>> my() =>
      _api.get('$_base/my', parse: (j) => [for (final e in _asList(j)) MyPaperExam.fromJson(e)]);

  Future<MyPaperDetail> myDetail(String id) => _api.get('$_base/my/${_enc(id)}', parse: MyPaperDetail.fromJson);
}

List<Object?> _asList(Object? j) => j is List ? j : const [];

final paperExamsRepositoryProvider = Provider<PaperExamsRepository>(
  (ref) => PaperExamsRepository(ref.watch(apiClientProvider)),
);

/// Ажилтны жагсаалт.
final paperExamsProvider = FutureProvider.autoDispose<List<PaperExamRow>>((ref) {
  ref.cacheFor(const Duration(minutes: 5));
  return swr(ref, () => ref.watch(paperExamsRepositoryProvider).list());
});

/// Нэг шалгалтын хүснэгт.
final paperBoardProvider = FutureProvider.autoDispose.family<PaperBoard, String>((ref, id) {
  ref.cacheFor(const Duration(minutes: 5));
  return swr(ref, () => ref.watch(paperExamsRepositoryProvider).board(id));
});

final paperImportsProvider = FutureProvider.autoDispose.family<List<ImportHistoryRow>, String>(
  (ref, id) => ref.watch(paperExamsRepositoryProvider).imports(id),
);

/// Сурагчийн өөрийн дүн (`/paper-exams/my`).
final myPaperExamsProvider = FutureProvider.autoDispose<List<MyPaperExam>>((ref) {
  ref.cacheFor(const Duration(minutes: 5));
  return swr(ref, () => ref.watch(paperExamsRepositoryProvider).my());
});

final myPaperDetailProvider = FutureProvider.autoDispose.family<MyPaperDetail, String>((ref, id) {
  ref.cacheFor(const Duration(minutes: 5));
  return swr(ref, () => ref.watch(paperExamsRepositoryProvider).myDetail(id));
});

/// Ажилтны харагдацад нэг сурагчийн нэгдсэн шалгалтууд. Сурагчаар шүүх API байхгүй тул дүн оруулсан
/// шалгалт бүрийн хүснэгтээс (эрхээр шүүгдсэн) тэр сурагчийн мөрийг авна.
final staffStudentPaperExamsProvider = FutureProvider.autoDispose.family<List<MyPaperExam>, String>((ref, studentId) {
  ref.cacheFor(const Duration(minutes: 5));
  return swr(ref, () async {
    final repo = ref.watch(paperExamsRepositoryProvider);
    final exams = (await repo.list()).where((e) => e.sheetCount > 0).toList();
    final boards = await Future.wait([for (final e in exams) repo.board(e.id)]);
    return studentRowsFromBoards(studentId, boards);
  });
});

/// Төхөөрөмжөөс сонгосон Excel.
typedef PickedSheet = ({String name, Uint8List bytes});

abstract interface class PaperSheetPicker {
  Future<PickedSheet?> pick();
}

/// Утасны файл сонгогч (`file_selector`): Android — MIME, iOS — UTI. Сервер зөвхөн .xlsx авна.
class FileSelectorPaperSheetPicker implements PaperSheetPicker {
  const FileSelectorPaperSheetPicker();

  static const _group = XTypeGroup(
    label: 'Excel',
    extensions: ['xlsx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    uniformTypeIdentifiers: ['org.openxmlformats.spreadsheetml.sheet'],
  );

  @override
  Future<PickedSheet?> pick() async {
    final file = await openFile(acceptedTypeGroups: const [_group]);
    if (file == null) return null;
    return (name: file.name, bytes: await file.readAsBytes());
  }
}

/// Файл сонгогч. `null` бол (сонгогчгүй төхөөрөмж) «Дүн оруулах» нь боломжгүйг тайлбарлана.
final paperSheetPickerProvider = Provider<PaperSheetPicker?>((ref) => const FileSelectorPaperSheetPicker());
