import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/network_providers.dart';
import '../../../core/time/ub_time.dart';
import '../data/results_models.dart';
import '../data/results_repository.dart';
import '../domain/results_logic.dart';

final resultsRepositoryProvider = Provider<ResultsRepository>((ref) => ResultsRepository(ref.watch(apiClientProvider)));

final resultsAccessProvider = Provider<ResultsAccess>((ref) {
  final s = ref.watch(sessionProvider);
  return ResultsAccess(s is SignedIn ? s.role : null);
});

/// «Өнөөдөр» (UB) — бүртгэлийн огноо. Тестэд тогтмол.
final resultsTodayProvider = Provider<UbDateTime>((ref) => UbDateTime.now());

/// CSV бичих түр хавтас. Тестэд солино.
final resultsTempDirProvider = Provider<Future<Directory> Function()>((ref) => getTemporaryDirectory);

final testResultsProvider = FutureProvider.autoDispose.family<List<ResultRow>, String>(
  (ref, testId) => ref.watch(resultsRepositoryProvider).results(testId),
);

/// Тестийн нэр, оноосон анги. Алдаа гарвал null (дүнгийн жагсаалт үүнээс хамаарахгүй).
final testMetaProvider = FutureProvider.autoDispose.family<TestMeta?, String>((ref, testId) async {
  try {
    return await ref.watch(resultsRepositoryProvider).meta(testId);
  } catch (_) {
    return null;
  }
});

/// Бөөнөөр оруулах ангиуд (тестэд оноосон, эс бөгөөс бүх анги).
final resultClassOptionsProvider = FutureProvider.autoDispose.family<List<ClassOption>, String>((ref, testId) async {
  final repo = ref.watch(resultsRepositoryProvider);
  final (meta, classes) = await (ref.watch(testMetaProvider(testId).future), repo.classrooms()).wait;
  return classOptionsFor(meta, classes);
});

/// Ангийн өнөөдрийн бүртгэл.
final classRosterProvider = FutureProvider.autoDispose.family<List<RosterStudent>, String>((ref, classId) {
  final today = ref.watch(resultsTodayProvider);
  return ref.watch(resultsRepositoryProvider).roster(classId, today.dateKey);
});

/// Бодлогын анализ: (тест, анги). Анги null = «Бүгд».
final examAnalyticsProvider = FutureProvider.autoDispose.family<ExamAnalytics, ({String testId, String? classId})>(
  (ref, k) => ref.watch(resultsRepositoryProvider).analytics(k.testId, classId: k.classId),
);

final studentAttemptProvider = FutureProvider.autoDispose.family<StudentAttempt, ({String testId, String studentId})>(
  (ref, k) => ref.watch(resultsRepositoryProvider).studentAttempt(k.testId, k.studentId),
);
