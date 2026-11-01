import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/network_providers.dart';
import 'formula_models.dart';
import 'json.dart';

class FormulaRepository {
  const FormulaRepository(this._api);

  final ApiClient _api;

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

final formulaRepositoryProvider = Provider<FormulaRepository>((ref) => FormulaRepository(ref.watch(apiClientProvider)));

class FormulaCatalog {
  const FormulaCatalog({required this.sections, required this.formulas});

  final List<FormulaSection> sections;
  final List<FormulaSummary> formulas;
}

final formulaCatalogProvider = FutureProvider.autoDispose<FormulaCatalog>((ref) async {
  final repo = ref.watch(formulaRepositoryProvider);
  final r = await Future.wait([repo.sections(), repo.catalog()]);
  final sections = [...(r[0] as List<FormulaSection>)]..sort((a, b) => a.order.compareTo(b.order));
  return FormulaCatalog(sections: sections, formulas: r[1] as List<FormulaSummary>);
});

final formulaDetailProvider = FutureProvider.autoDispose.family<FormulaDetail, String>(
  (ref, slug) => ref.watch(formulaRepositoryProvider).detail(slug),
);

final myFormulasProvider = FutureProvider.autoDispose<SeenFormulas>((ref) => ref.watch(formulaRepositoryProvider).mine());
