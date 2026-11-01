import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../data/exam_models.dart';
import '../data/exam_repository.dart';
import '../domain/test_list_logic.dart';

/// «Өгөх» / «Өгсөн, дүн» табын өгөгдөл — вэбийн `StudentExamsHub` (+ `StudentExamLists`).
@immutable
class TestsHub {
  const TestsHub({required this.practice, required this.examsToTake, required this.done});

  /// Дасгал тест (А/Б нэгтгэсэн), сэдвээр бүлэглэхэд.
  final List<TestRow> practice;

  /// Оноосон шалгалт (эхлэх / үргэлжлүүлэх / удахгүй).
  final List<TestRow> examsToTake;

  /// Өгсөн (дүнтэй, ирээгүй, дүн гараагүй) — шалгалт + дасгал.
  final List<TestRow> done;

  List<TestRow> get inProgress => [
    ...examsToTake.where((r) => r.sessionStatus == SessionStatus.inProgress),
    ...practice.where((r) => r.sessionStatus == SessionStatus.inProgress),
  ];
}

final testsHubProvider = FutureProvider.autoDispose<TestsHub>((ref) async {
  final repo = ref.watch(examRepositoryProvider);
  final s = ref.watch(sessionProvider);
  final studentId = s is SignedIn ? (s.user?.id ?? s.auth.userId) : null;
  final results = await Future.wait([repo.tests(), repo.myExams()]);
  final tests = results[0];
  final exams = results[1];
  final practiceAll = tests.where((r) => !isExamType(r.type) && !r.upcoming).toList();
  final practice = collapseVariants(practiceAll, studentId);
  final examsToTake = exams.where((r) => !r.done && !r.absent).toList();
  final done = [...exams.where((r) => r.done || r.absent), ...practice.where((r) => r.done)];
  return TestsHub(practice: practice.where((r) => !r.done).toList(), examsToTake: examsToTake, done: done);
});

/// `/app/tests` — шалгалт, тестийн жагсаалт.
class TestsListScreen extends ConsumerStatefulWidget {
  const TestsListScreen({super.key});

  @override
  ConsumerState<TestsListScreen> createState() => _TestsListScreenState();
}

class _TestsListScreenState extends ConsumerState<TestsListScreen> {
  String _query = '';

  @override
  Widget build(BuildContext context) {
    final hub = ref.watch(testsHubProvider);
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Шалгалт'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Өгөх'),
              Tab(text: 'Өгсөн, дүн'),
            ],
          ),
        ),
        body: hub.when(
          skipLoadingOnRefresh: true,
          loading: () => const LoadingState(),
          error: (e, _) => ErrorState(
            title: 'Тестийн жагсаалт ачаалж чадсангүй',
            message: e is ApiError ? e.message : AppStrings.genericError,
            onRetry: () => ref.invalidate(testsHubProvider),
          ),
          data: (h) => TabBarView(
            children: [
              _TakeTab(hub: h, query: _query, onQuery: (q) => setState(() => _query = q)),
              _DoneTab(rows: h.done),
            ],
          ),
        ),
      ),
    );
  }
}

class _TakeTab extends ConsumerWidget {
  const _TakeTab({required this.hub, required this.query, required this.onQuery});

  final TestsHub hub;
  final String query;
  final ValueChanged<String> onQuery;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final practice = hub.practice.where((r) => matchesQuery(r, query)).toList();
    final exams = hub.examsToTake.where((r) => matchesQuery(r, query)).toList();
    final groups = groupByTopic(practice);
    final inProgress = hub.inProgress;
    final children = <Widget>[
      TextField(
        decoration: const InputDecoration(
          hintText: 'Шалгалт, тестээр хайх',
          prefixIcon: Icon(AppIcons.search, size: 20),
        ),
        onChanged: onQuery,
      ),
      if (inProgress.isNotEmpty && query.isEmpty) ...[
        const SizedBox(height: AppSpace.lg),
        AppCard(
          accent: context.colors.brandBright,
          onTap: () => context.push('/app/tests/${inProgress.first.id}'),
          child: Row(
            children: [
              Icon(AppIcons.timer, color: context.colors.brand),
              const SizedBox(width: AppSpace.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      inProgress.length == 1
                          ? 'Дуусаагүй шалгалт байна'
                          : '${inProgress.length} дуусаагүй шалгалт байна',
                      style: context.text.titleSmall,
                    ),
                    MetaTitle(inProgress.first.title, style: context.text.bodySmall),
                  ],
                ),
              ),
              Icon(AppIcons.forward, color: context.colors.inkDim),
            ],
          ),
        ),
      ],
      if (exams.isNotEmpty) ...[
        const SectionHeader(title: 'Шалгалт'),
        for (final r in exams) ...[_TestTile(row: r), const SizedBox(height: AppSpace.sm)],
      ],
      for (final g in groups) ...[
        SectionHeader(title: g.topic),
        for (final r in g.rows) ...[_TestTile(row: r), const SizedBox(height: AppSpace.sm)],
      ],
    ];
    if (exams.isEmpty && practice.isEmpty) {
      children.add(
        SizedBox(
          height: 320,
          child: EmptyState(
            icon: AppIcons.exam,
            title: query.isEmpty ? 'Өгөх тест алга' : '«$query» гэсэн тест алга',
            message: query.isEmpty ? 'Ангидаа үзсэн сэдвийн тестүүд энд нээгдэнэ' : null,
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: () => ref.refresh(testsHubProvider.future),
      child: ListView(padding: const EdgeInsets.all(AppSpace.gutter), children: children),
    );
  }
}

class _DoneTab extends ConsumerWidget {
  const _DoneTab({required this.rows});

  final List<TestRow> rows;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (rows.isEmpty) {
      return const EmptyState(
        icon: AppIcons.exam,
        title: 'Өгсөн шалгалт алга',
        message: 'Шалгалт өгмөгц дүн нь энд харагдана',
      );
    }
    return RefreshIndicator(
      onRefresh: () => ref.refresh(testsHubProvider.future),
      child: ListView.separated(
        padding: const EdgeInsets.all(AppSpace.gutter),
        itemCount: rows.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
        itemBuilder: (_, i) => _TestTile(row: rows[i]),
      ),
    );
  }
}

/// Нэг тестийн мөр: гарчиг, мета (бодлого, хугацаа, ном), төлөв / дүн.
class _TestTile extends StatelessWidget {
  const _TestTile({required this.row});

  final TestRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final r = row;
    final title = r.type == 'THOUSAND' ? thousandShortTitle(r.title) : r.title;
    final score = r.result;
    final percent = r.percent ?? score?.percent;

    final String? status;
    final IconData? statusIcon;
    if (r.absent) {
      status = 'Ирээгүй';
      statusIcon = AppIcons.failure;
    } else if (score != null) {
      status = '${formatScore(score.total)}/${formatScore(score.max)}${percent == null ? '' : ' ($percent%)'}';
      statusIcon = AppIcons.success;
    } else if (r.sessionStatus == SessionStatus.submitted) {
      status = 'Дүн гараагүй';
      statusIcon = AppIcons.time;
    } else if (r.upcoming) {
      status = r.assignedAt == null
          ? 'Удахгүй'
          : 'Эхлэх: ${DateMn.numericWithTime(UbDateTime.fromInstant(r.assignedAt!))}';
      statusIcon = AppIcons.calendar;
    } else if (r.manual) {
      status = 'Цаасаар өгнө';
      statusIcon = AppIcons.document;
    } else if (r.sessionStatus == SessionStatus.inProgress) {
      status = 'Үргэлжлүүлэх';
      statusIcon = AppIcons.timer;
    } else {
      status = null;
      statusIcon = null;
    }

    final canOpen = !r.upcoming && !(r.manual && !r.done) && !r.absent;
    final path = r.done ? _resultPath(r) : '/app/tests/${r.id}';

    return AppCard(
      onTap: canOpen ? () => context.push(path) : null,
      semanticLabel: [title, ?status].join(', '),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MetaTitle(title, style: context.text.titleSmall),
                const SizedBox(height: 2),
                Meta(
                  items: [
                    if (r.problemCount > 0) '${r.problemCount} бодлого',
                    if (r.timeLimitMin != null && r.timeLimitMin! > 0) '${r.timeLimitMin} мин',
                    studentBookLabel(r.book),
                    if (r.variantLabel != null) '${r.variantLabel} хувилбар',
                  ],
                ),
              ],
            ),
          ),
          if (status != null) ...[
            const SizedBox(width: AppSpace.sm),
            Icon(statusIcon, size: 16, color: score != null ? c.success : c.inkDim),
            const SizedBox(width: AppSpace.xs),
            Flexible(
              child: Text(status, style: context.text.labelMedium, textAlign: TextAlign.end),
            ),
          ] else if (canOpen) ...[
            const SizedBox(width: AppSpace.sm),
            Text('Эхлэх', style: context.text.labelMedium?.copyWith(color: c.brand)),
          ],
        ],
      ),
    );
  }

  static String _resultPath(TestRow r) =>
      isExamType(r.type) ? '/app/tests/${r.id}/result' : '/app/tests/${r.id}/review';
}
