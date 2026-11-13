import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/session.dart';
import '../../../core/auth/user_role.dart';
import '../../../core/ui/ui.dart';
import '../data/paper_exam_models.dart';
import '../data/paper_exams_repository.dart';
import '../domain/paper_exam_logic.dart';
import 'paper_ui.dart';
import 'sheet_detail_sheet.dart';

/// Сурагчийн нэгдсэн шалгалтын дүн (вэбийн `StudentPaperExams`): шалгалт бүрийн оноо, байр.
///
/// - Сурагч өөрөө ([studentId] нь нэвтэрсэн хүн): `/paper-exams/my`, мөр дарвал өөрийн дэлгэрэнгүй
///   (`/app/paper-exams/:id`). Вэбд «Шалгалт → Нэгдсэн шалгалт» таб.
/// - Ажилтан (сурагчийн хуудас): шалгалт бүрийн хүснэгтээс тэр сурагчийн мөр (сервер эрхээр шүүнэ —
///   Багш өөрийн ангийн сурагчийг л харна), мөр дарвал хуудасны дэлгэрэнгүй.
///
/// Өөрөө гүйлгэгддэг (ListView) — табын агуулга болгон шууд тавина.
class StudentPaperExams extends ConsumerWidget {
  const StudentPaperExams({super.key, required this.studentId});

  final String studentId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final s = ref.watch(sessionProvider);
    final self = s is SignedIn && s.role == UserRole.student && (s.user?.id ?? s.auth.userId) == studentId;
    final staff = s is SignedIn && s.role.isStaff;
    if (!self && !staff) {
      return const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden);
    }
    final provider = self ? myPaperExamsProvider : staffStudentPaperExamsProvider(studentId);
    final async = ref.watch(provider);
    return async.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(cards: 3),
      error: (e, _) => ErrorState(message: paperError(e), onRetry: () => ref.invalidate(provider)),
      data: (rows) => RefreshIndicator(
        onRefresh: () => ref.refresh(provider.future),
        child: rows.isEmpty
            ? ListView(
                children: const [
                  SizedBox(
                    height: 360,
                    child: EmptyState(
                      icon: AppIcons.scan,
                      title: 'Нэгдсэн шалгалтын дүн алга',
                      message: 'Багш дүнг оруулж нээсний дараа энд харагдана',
                    ),
                  ),
                ],
              )
            : ListView.separated(
                padding: const EdgeInsets.all(AppSpace.gutter),
                itemCount: rows.length,
                separatorBuilder: (_, _) => const SizedBox(height: AppSpace.sm),
                itemBuilder: (context, i) => _Row(row: rows[i], self: self, studentId: studentId),
              ),
      ),
    );
  }
}

class _Row extends ConsumerWidget {
  const _Row({required this.row, required this.self, required this.studentId});

  final MyPaperExam row;
  final bool self;
  final String studentId;

  Future<void> _open(BuildContext context, WidgetRef ref) async {
    if (self) {
      await context.push('/app/paper-exams/${Uri.encodeComponent(row.id)}');
      return;
    }
    try {
      final board = await ref.read(paperBoardProvider(row.id).future);
      BoardRow? found;
      for (final g in board.groups) {
        for (final r in g.rows) {
          if (r.sheetId == row.sheetId) found = r.withGroup(g.label);
        }
      }
      if (found != null && context.mounted) await showSheetDetail(context, row: found, board: board);
    } catch (e) {
      if (context.mounted) paperSnack(context, paperError(e));
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return AppCard(
      key: Key('paper-my-${row.id}'),
      onTap: () => _open(context, ref),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(row.title, style: context.text.titleSmall),
                const SizedBox(height: 2),
                Meta(
                  items: [
                    dayText(row.heldOn),
                    if (row.group != null) row.group,
                    if (row.rank != null)
                      row.participants != null
                          ? '${row.rank}-р байр, ${row.participants} сурагчаас'
                          : 'төвд ${row.rank}-р байр',
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              ScoreText(score: row.totalScore, max: row.maxScore),
              PctBadge(pct: row.pct),
            ],
          ),
          const SizedBox(width: AppSpace.xs),
          Icon(AppIcons.forward, size: 18, color: context.colors.inkDim),
        ],
      ),
    );
  }
}
