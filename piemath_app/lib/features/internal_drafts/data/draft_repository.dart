import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:file_selector/file_selector.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'draft_models.dart';

String _enc(String v) => Uri.encodeComponent(v);

/// «Дотоод» ноорог (`api/src/internal-drafts`, зөвхөн Админ, Багш+) ба Word импорт (`api/src/document-import`).
///
/// Анхааруулга: серверийн `DELETE /internal-drafts/blocks/:id` бодлогыг бүр мөсөн устгадаг тул апп-д байхгүй
/// (прод өгөгдлийн дүрэм) — ноорог бүхэлдээ зөөлөн устгагдана (`DELETE /sets/:id` → `deletedAt`).
class DraftRepository {
  const DraftRepository(this._api);

  final ApiClient _api;

  static const _base = '/internal-drafts';

  Future<List<DraftSet>> list() =>
      _api.get('$_base/sets', parse: (j) => [for (final e in asList(j)) DraftSet.fromJson(e)]);

  Future<DraftSet> create() => _api.post('$_base/sets', body: const <String, Object?>{}, parse: DraftSet.fromJson);

  Future<DraftSet> get(String id) => _api.get('$_base/sets/${_enc(id)}', parse: DraftSet.fromJson);

  Future<void> updateSet(String id, Json patch) => _api.patch<Object?>('$_base/sets/${_enc(id)}', body: patch);

  /// Зөөлөн устгал (`deletedAt`) — нийтэлсэн бодлого, тест хэвээр үлдэнэ.
  Future<void> deleteSet(String id) => _api.delete<Object?>('$_base/sets/${_enc(id)}');

  Future<DraftBlock> addBlock(String setId, {String? afterId}) => _api.post(
    '$_base/sets/${_enc(setId)}/blocks',
    body: {
      'afterId': ?afterId,
      'kind': 'CHOICE',
      'choices': const ['', '', '', ''],
    },
    parse: DraftBlock.fromJson,
  );

  Future<List<DraftBlock>> addBlocks(String setId, List<DraftContent> blocks, {required String source}) => _api.post(
    '$_base/sets/${_enc(setId)}/blocks/bulk',
    body: {
      'blocks': [for (final b in blocks) b.toJson()],
      'source': source,
    },
    parse: (j) => [for (final e in asList(j)) DraftBlock.fromJson(e)],
  );

  /// [expectedVersion] — өөр хүн зэрэг засвал сервер 409 өгнө (дарж бичихгүй).
  Future<DraftBlock> updateBlock(String id, DraftContent c, {required int expectedVersion}) => _api.patch(
    '$_base/blocks/${_enc(id)}',
    body: {...c.toJson(), 'expectedVersion': expectedVersion},
    parse: DraftBlock.fromJson,
  );

  Future<DraftBlock> duplicate(String id) =>
      _api.post('$_base/blocks/${_enc(id)}/duplicate', body: const <String, Object?>{}, parse: DraftBlock.fromJson);

  Future<void> reorder(String setId, List<String> ids) =>
      _api.put<Object?>('$_base/sets/${_enc(setId)}/order', body: {'blockIds': ids});

  Future<DraftCheck> check(String setId, Map<String, String> answers) =>
      _api.post('$_base/sets/${_enc(setId)}/check', body: {'answers': answers}, parse: DraftCheck.fromJson);

  Future<DraftPublishResult> publish(
    String setId, {
    required String chapterId,
    String? testTitle,
    DraftTestType type = DraftTestType.custom,
    bool testIsDraft = true,
    int? timeLimitMin,
  }) => _api.post(
    '$_base/sets/${_enc(setId)}/publish',
    body: {
      'chapterId': chapterId,
      if (testTitle != null && testTitle.isNotEmpty)
        'test': {'title': testTitle, 'type': type.api, 'isDraft': testIsDraft, 'timeLimitMin': ?timeLimitMin},
    },
    parse: DraftPublishResult.fromJson,
  );

  Future<List<DraftChapterRef>> chapters(DraftSubject subject) => _api.get(
    '/chapters',
    query: {'subject': subject.api},
    parse: (j) => [for (final e in asList(j)) DraftChapterRef.fromJson(e)],
  );

  Future<List<DraftChapterRef>> allChapters() =>
      _api.get('/chapters', parse: (j) => [for (final e in asList(j)) DraftChapterRef.fromJson(e)]);

  // ---- Word ----

  /// `.docx`-ийг задлаж урьдчилан харна (OMML томьёо → LaTeX). Хадгалахгүй.
  Future<WordPreview> wordPreview(Uint8List bytes, String fileName) async {
    final form = FormData()
      ..files.add(
        MapEntry(
          'file',
          MultipartFile.fromBytes(
            bytes,
            filename: fileName,
            contentType: DioMediaType.parse('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
          ),
        ),
      );
    try {
      return await _api.post('/document-import/preview', body: form, parse: WordPreview.fromJson);
    } on ApiError {
      rethrow;
    } catch (_) {
      throw const ApiError(ApiErrorKind.network, 'Файлыг уншиж чадсангүй. Дахин оролдоно уу');
    }
  }

  /// Нэг бодлогыг бүлэгт хадгална. Ижил бодлого байвал `duplicate: true`.
  Future<({String problemId, bool duplicate})> wordConfirm({
    required String token,
    required String chapterId,
    required String promptId,
    required List<String> choiceIds,
    required String correctId,
  }) => _api.post(
    '/document-import/confirm',
    body: {
      'previewToken': token,
      'chapterId': chapterId,
      'confirmed': true,
      'warningsAcknowledged': true,
      'mapping': {'promptId': promptId, 'choiceIds': choiceIds, 'correctChoiceId': correctId},
    },
    parse: (j) => (problemId: asStr(asMap(j)['problemId']) ?? '', duplicate: asBool(asMap(j)['duplicate'])),
  );
}

final draftRepositoryProvider = Provider<DraftRepository>((ref) => DraftRepository(ref.watch(apiClientProvider)));

/// Ноорог, Word импорт — зөвхөн Админ, Багш+ (сурагч, эцэг эх, Багшид хэзээ ч харагдахгүй).
final draftAccessProvider = Provider<bool>((ref) {
  final s = ref.watch(sessionProvider);
  return s is SignedIn && (s.role == UserRole.admin || s.role == UserRole.teacherPlus);
});

final draftSetsProvider = FutureProvider.autoDispose<List<DraftSet>>(
  (ref) => ref.watch(draftRepositoryProvider).list(),
);

final draftSetProvider = FutureProvider.autoDispose.family<DraftSet, String>(
  (ref, id) => ref.watch(draftRepositoryProvider).get(id),
);

/// `.docx` сонгогч (тестэд солино).
abstract class DocxPicker {
  const DocxPicker();
  Future<({String name, Uint8List bytes})?> pick();
}

class FileSelectorDocxPicker extends DocxPicker {
  const FileSelectorDocxPicker();

  static const _group = XTypeGroup(
    label: 'Word',
    extensions: ['docx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    uniformTypeIdentifiers: ['org.openxmlformats.wordprocessingml.document'],
  );

  @override
  Future<({String name, Uint8List bytes})?> pick() async {
    final f = await openFile(acceptedTypeGroups: const [_group]);
    if (f == null) return null;
    return (name: f.name, bytes: await f.readAsBytes());
  }
}

final docxPickerProvider = Provider<DocxPicker>((ref) => const FileSelectorDocxPicker());
