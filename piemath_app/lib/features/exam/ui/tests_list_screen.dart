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
import '../data/ranking_models.dart';
import '../domain/test_list_logic.dart';
import 'ranking_screen.dart' show testRankingProvider;

/// «Өгөх» / «Өгсөн, дүн» / «Эрэмбэ» табын өгөгдөл — вэбийн `StudentExamsHub` (+ `StudentExamLists`).
@immutable
class TestsHub {
  const TestsHub({required this.practice, required this.examsToTake, required this.done, required this.results});

  /// Дасгал тест (А/Б нэгтгэсэн), сэдвээр бүлэглэхэд.
  final List<TestRow> practice;

  /// Оноосон шалгалт (эхлэх / үргэлжлүүлэх / удахгүй) — А/Б-оос нэг.
  final List<TestRow> examsToTake;

  /// «Өгсөн, дүн»: шалгалтын өгсөн + `/tests/my-results`-ийн бусад дүн (вэбтэй ижил).
  final List<DoneRow> done;

  /// «Эрэмбэ» таб: миний бүх дүн (`/tests/my-results`). Байрыг товшиж нээхэд л татна.
  final List<MyResult> results;

  List<TestRow> get inProgress => [
    ...examsToTake.where((r) => r.sessionStatus == SessionStatus.inProgress),
    ...practice.where((r) => r.sessionStatus == SessionStatus.inProgress),
  ];
}

final testsHubProvider = FutureProvider.autoDispose<TestsHub>((ref) async {
  final repo = ref.watch(examRepositoryProvider);
  final s = ref.watch(sessionProvider);
  final studentId = s is SignedIn ? (s.user?.id ?? s.auth.userId) : null;
  final (tests, exams, results) = await (repo.tests(), repo.myExams(), repo.myResults()).wait;
  final practice = collapseVariants(tests.where((r) => !isExamType(r.type) && !r.upcoming).toList(), studentId);
  final picked = collapseVariants(exams, studentId);
  return TestsHub(
    practice: practice.where((r) => !r.done).toList(),
    examsToTake: sortExamsToTake(picked.where((r) => !examIsTaken(r))),
    done: buildDoneRows(takenExams: picked.where(examIsTaken).toList(), allExams: exams, results: results),
    results: results,
  );
});

/// `/app/tests` — шалгалт, тестийн жагсаалт. [initialTab] = `give | done | rank` (вэбийн `?tab=`).
class TestsListScreen extends ConsumerStatefulWidget {
  const TestsListScreen({super.key, this.initialTab});

  final String? initialTab;

  @override
  ConsumerState<TestsListScreen> createState() => _TestsListScreenState();
}

class _TestsListScreenState extends ConsumerState<TestsListScreen> {
  String _query = '';

  static const _tabs = ['give', 'done', 'rank'];

  @override
  Widget build(BuildContext context) {
    final hub = ref.watch(testsHubProvider);
    final initial = _tabs.indexOf(widget.initialTab ?? '');
    return DefaultTabController(
      length: _tabs.length,
      initialIndex: initial < 0 ? 0 : initial,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Шалгалт'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Өгөх'),
              Tab(text: 'Өгсөн, дүн'),
              Tab(text: 'Эрэмбэ'),
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
              _RankTab(results: h.results),
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

  final List<DoneRow> rows;

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
        itemBuilder: (_, i) => _DoneTile(row: rows[i]),
      ),
    );
  }
}

/// Өгсөн дүнгийн мөр: гарчиг, огноо, хувь + оноо (вэбийн `DoneTab`: хувь = `round(total/max*100)`).
class _DoneTile extends StatelessWidget {
  const _DoneTile({required this.row});

  final DoneRow row;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final r = row;
    final score = r.score;
    final percent = score?.percent;
    final date = r.date == null ? null : DateMn.numeric(UbDateTime.fromInstant(r.date!));
    final String status;
    if (r.absent) {
      status = 'Ирээгүй';
    } else if (score != null) {
      status = '${percent == null ? '' : '$percent%, '}${formatScore(score.total)}/${formatScore(score.max)}';
    } else {
      status = 'Дүн гараагүй';
    }
    return AppCard(
      onTap: r.absent ? null : () => context.push(r.path),
      semanticLabel: [r.title, ?date, status].join(', '),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                MetaTitle(r.title, style: context.text.titleSmall),
                if (date != null) Text(date, style: context.text.bodySmall),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          if (score != null && !r.absent)
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                if (percent != null) Text('$percent%', style: context.text.titleMedium),
                Text('${formatScore(score.total)}/${formatScore(score.max)}', style: context.text.bodySmall),
              ],
            )
          else
            Text(status, style: context.text.labelMedium?.copyWith(color: c.inkDim)),
        ],
      ),
    );
  }
}

/// «Эрэмбэ» таб — вэбийн `MyRankings`: дүн бүр дээр «Миний эрэмбэ» товч. Байрыг ТОВШИЖ нээсний дараа л
/// `/test-rankings/:id` татна (анхдагчаар харуулахгүй — хүүхдэд өөрөө сонгох эрх).
class _RankTab extends ConsumerWidget {
  const _RankTab({required this.results});

  final List<MyResult> results;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (results.isEmpty) {
      return const EmptyState(
        icon: AppIcons.ranking,
        title: 'Эрэмбэ хараахан алга',
        message: 'Шалгалт өгмөгц ангидаа хэддүгээрт орсноо энд харна',
      );
    }
    return RefreshIndicator(
      onRefresh: () => ref.refresh(testsHubProvider.future),
      child: ListView.separated(
        padding: const EdgeInsets.all(AppSpace.gutter),
        itemCount: results.length,
        separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
        itemBuilder: (_, i) => _RankCard(result: results[i]),
      ),
    );
  }
}

class _RankCard extends ConsumerStatefulWidget {
  const _RankCard({required this.result});

  final MyResult result;

  @override
  ConsumerState<_RankCard> createState() => _RankCardState();
}

class _RankCardState extends ConsumerState<_RankCard> {
  bool _open = false;

  @override
  Widget build(BuildContext context) {
    final r = widget.result;
    final date = r.createdAt == null ? null : DateMn.numeric(UbDateTime.fromInstant(r.createdAt!));
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          InkWell(
            onTap: () =>
                context.push(isExamType(r.type) ? '/app/tests/${r.testId}/result' : '/app/tests/${r.testId}/review'),
            child: Row(
              children: [
                Expanded(child: MetaTitle(r.title, style: context.text.titleSmall)),
                const SizedBox(width: AppSpace.sm),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text('${formatScore(r.score.total)}/${formatScore(r.score.max)}', style: context.text.titleMedium),
                    if (date != null) Text(date, style: context.text.bodySmall),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: AppSpace.xs),
          TextButton.icon(
            onPressed: () => setState(() => _open = !_open),
            icon: AnimatedRotation(
              turns: _open ? 0.5 : 0,
              duration: AppMotion.base,
              child: const Icon(AppIcons.expand, size: 18),
            ),
            label: const Text('Миний эрэмбэ'),
          ),
          if (_open) _RankBody(testId: r.testId),
        ],
      ),
    );
  }
}

class _RankBody extends ConsumerWidget {
  const _RankBody({required this.testId});

  final String testId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(testRankingProvider(testId));
    return async.when(
      loading: () => const Padding(padding: EdgeInsets.all(AppSpace.md), child: LoadingState()),
      error: (e, _) => e is ApiError && (e.kind == ApiErrorKind.notFound || e.kind == ApiErrorKind.forbidden)
          ? Text('Байр одоогоор харагдахгүй байна', style: context.text.bodySmall)
          : ErrorState(
              title: 'Эрэмбийг ачаалж чадсангүй',
              message: e is ApiError ? e.message : AppStrings.genericError,
              onRetry: () => ref.invalidate(testRankingProvider(testId)),
            ),
      data: (r) {
        final entries = [
          ...r.classes,
          ?r.school,
          if (r.exam != null)
            RankEntry(label: 'Энэ шалгалт', rank: r.exam!.rank, participants: r.exam!.participants, tied: r.exam!.tied),
        ];
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            for (final e in entries)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
                child: Row(
                  children: [
                    Expanded(child: Text(e.label, style: context.text.bodyMedium)),
                    Text(
                      [
                        e.rank == null ? 'Эрэмбэ тооцохгүй' : '${e.rank} / ${e.participants}',
                        ?tiedLabel(e.tied),
                      ].join(', '),
                      style: context.text.titleSmall,
                    ),
                  ],
                ),
              ),
            const SizedBox(height: AppSpace.xs),
            Text(
              'Ижил хувийн дүнтэй сурагчид ижил байр эзэлнэ. Бусдын нэр, код харагдахгүй',
              style: context.text.bodySmall,
            ),
          ],
        );
      },
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
