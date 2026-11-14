import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/env.dart';
import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'formula_models.dart';
import 'json.dart';

/// Вэбийн статик файлын суурь хаяг (`/tools/formulas.json`) — тестэд солино.
final formulaWebBaseProvider = Provider<String>((ref) => Env.webBaseUrl);

class FormulaRepository {
  const FormulaRepository(this._api, this._webBase);

  final ApiClient _api;
  final String _webBase;

  /// Вэбийн хөнгөн жагсаалт `tools/formulas.json` (v2: гарчиг, томьёо, энгийн тайлбарын эхний хэсэг).
  /// Нэвтрэлт шаардахгүй; алхам, жишээ нь [sectionDetail]-д тусдаа.
  Future<FormulaCatalog> staticCatalog() => _api.get(
    '$_webBase/tools/formulas.json',
    auth: false,
    parse: (j) {
      final m = asMap(j);
      final formulas = [for (final f in asList(m['formulas'])) FormulaSummary.fromJson(f)];
      if (formulas.isEmpty) throw const FormatException('empty');
      return FormulaCatalog(
        sections: [for (final s in asList(m['sections'])) FormulaSection.fromJson(s)]
          ..sort((a, b) => a.order.compareTo(b.order)),
        formulas: formulas,
      );
    },
  );

  /// Бүлгийн дэлгэрэнгүй `tools/formulas-detail/<бүлэг>.json` — зөвхөн «Алхамаар ойлгох»-ыг
  /// (`simpleMore`) үлдээж, бусдыг санах ойд хадгалахгүй (хуучин утсанд хөнгөн).
  Future<Map<String, FormulaSimpleMore>> sectionDetail(String section) {
    if (!isSafeId(section)) throw const ApiError(ApiErrorKind.notFound, 'Бүлэг олдсонгүй.');
    return _api.get(
      '$_webBase/tools/formulas-detail/$section.json',
      auth: false,
      parse: (j) {
        final out = <String, FormulaSimpleMore>{};
        for (final e in asMap(j).entries) {
          final more = FormulaSimpleMore.tryParse(asMap(e.value)['simpleMore']);
          if (more != null) out[e.key] = more;
        }
        return out;
      },
    );
  }

  Future<List<FormulaSection>> sections() =>
      _api.get('/formulas/sections', parse: (j) => [for (final s in asList(j)) FormulaSection.fromJson(s)]);

  Future<List<FormulaSummary>> catalog() =>
      _api.get('/formulas', parse: (j) => [for (final f in asList(j)) FormulaSummary.fromJson(f)]);

  Future<FormulaDetail> detail(String slug) {
    if (!isSafeId(slug)) throw const ApiError(ApiErrorKind.notFound, 'Томьёо олдсонгүй.');
    return _api.get('/formulas/$slug', parse: FormulaDetail.fromJson);
  }

  Future<SeenFormulas> mine() => _api.get('/formulas/my', parse: SeenFormulas.fromJson);
}

final formulaRepositoryProvider = Provider<FormulaRepository>((ref) => FormulaRepository(ref.watch(apiClientProvider), ref.watch(formulaWebBaseProvider)));

class FormulaCatalog {
  const FormulaCatalog({required this.sections, required this.formulas});

  final List<FormulaSection> sections;
  final List<FormulaSummary> formulas;
}

/// Жагсаалт: эхлээд вэбийн хөнгөн статик файл (энгийн тайлбартай), боломжгүй бол API.
/// Сесс дуустал санах ойд хадгална — Томьёоны сан руу дахин орохдоо дахин татахгүй.
final formulaCatalogProvider = FutureProvider<FormulaCatalog>((ref) async {
  final repo = ref.watch(formulaRepositoryProvider);
  try {
    return await repo.staticCatalog();
  } catch (_) {
    final r = await Future.wait([repo.sections(), repo.catalog()]);
    final sections = [...(r[0] as List<FormulaSection>)]..sort((a, b) => a.order.compareTo(b.order));
    return FormulaCatalog(sections: sections, formulas: r[1] as List<FormulaSummary>);
  }
}, retry: (_, _) => null);

/// Бүлгийн «Алхамаар ойлгох» өгөгдөл — хэрэглэгч анх нээхэд л татаж, бүлэг тутамд нэг удаа кэшлэнэ.
final formulaSectionDetailProvider = FutureProvider.family<Map<String, FormulaSimpleMore>, String>(
  (ref, section) => ref.watch(formulaRepositoryProvider).sectionDetail(section),
  retry: (_, _) => null,
);

final formulaDetailProvider = FutureProvider.autoDispose.family<FormulaDetail, String>(
  (ref, slug) => ref.watch(formulaRepositoryProvider).detail(slug),
);

final myFormulasProvider = FutureProvider.autoDispose<SeenFormulas>((ref) => ref.watch(formulaRepositoryProvider).mine());
