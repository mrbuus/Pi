import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/shell/app_shell.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/marks/marks.dart';
import '../data/hub_models.dart';
import '../data/my_class_repository.dart';
import '../domain/hub_logic.dart';
import 'common.dart';
import 'photo_viewer.dart';

/// Нэг хичээлийн өдрийн БҮХ мэдээлэл (вэбийн `DaySheet`): сэдэв, багш, бодлого, миний ирц,
/// багшийн тэмдэглэгээ, тест, онолын зураг, миний даалгаврын зураг.
/// Зам: `/app/my-class/day/<YYYY-MM-DD>/<classroomId>` — линкээр шууд нээгдэнэ.
class DayScreen extends ConsumerWidget {
  const DayScreen({super.key, required this.date, required this.classroomId});

  final String date;
  final String classroomId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final month = date.substring(0, 7);
    final days = ref.watch(hubDaysProvider(month));
    final day = days.value?.days.where((d) => dayKeyOf(d.date) == date && d.classroomId == classroomId).firstOrNull;
    return Scaffold(
      appBar: AppBar(
        leading: const AppBackButton(),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(dayTitle(date), maxLines: 1, overflow: TextOverflow.ellipsis),
            if (day != null) Meta(items: [day.classroomName, timeRange(day.startMinute, day.endMinute)]),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            refreshProviders(ref, [hubDaysProvider(month), theoryDayProvider((classroomId: classroomId, date: date))]),
        child: AsyncBody(
          value: days,
          onRetry: () => ref.invalidate(hubDaysProvider(month)),
          builder: (_) => day == null
              ? ListView(
                  children: const [
                    SizedBox(height: AppSpace.xxl),
                    EmptyState(
                      icon: AppIcons.calendarEmpty,
                      title: 'Энэ өдөр хичээл олдсонгүй',
                      message: 'Хичээлүүдийн жагсаалтаас өдрөө сонгоно уу',
                    ),
                  ],
                )
              : _DayBody(day: day),
        ),
      ),
    );
  }
}

class _DayBody extends StatelessWidget {
  const _DayBody({required this.day});

  final HubDay day;

  @override
  Widget build(BuildContext context) {
    final topic = day.topic?.trim();
    return ListView(
      padding: const EdgeInsets.all(AppSpace.gutter),
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  RoomBadge(room: day.room),
                  const SizedBox(width: AppSpace.md),
                  Expanded(
                    child: Text(
                      topic == null || topic.isEmpty ? 'Сэдэв оруулаагүй' : topic,
                      style: topic == null || topic.isEmpty
                          ? context.text.bodyMedium?.copyWith(color: context.colors.inkDim)
                          : context.text.titleMedium,
                    ),
                  ),
                ],
              ),
              if (day.teachers.isNotEmpty || day.problemNumbers != null) ...[
                const SizedBox(height: AppSpace.sm),
                Meta(
                  items: [
                    if (day.teachers.isNotEmpty) day.teachers.join(', '),
                    if (day.problemNumbers != null) 'Бодлого ${day.problemNumbers}',
                  ],
                  style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                ),
              ],
            ],
          ),
        ),
        const SectionHeader(title: 'Миний ирц, даалгавар'),
        _MarksCard(day: day),
        SectionHeader(title: 'Тестүүд', trailing: day.tests.isEmpty ? null : Text('${day.tests.length}')),
        _TestsCard(tests: day.tests),
        SectionHeader(
          title: 'Онолын зураг',
          trailing: day.theory.assignedToMe ? const InfoPill(label: 'Томилогдсон') : null,
        ),
        _TheoryCard(day: day),
        const SectionHeader(title: 'Миний даалгаврын зураг'),
        _HomeworkPhotoCard(day: day),
        const SizedBox(height: AppSpace.xl),
      ],
    );
  }
}

class _MarksCard extends StatelessWidget {
  const _MarksCard({required this.day});

  final HubDay day;

  @override
  Widget build(BuildContext context) {
    final hw = day.homework;
    final dim = context.text.bodyMedium?.copyWith(color: context.colors.inkDim);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              SizedBox(width: 96, child: Text('Ирц', style: dim)),
              Expanded(
                child: Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: AttendanceMarkView(status: day.attendance?.status, lateRange: day.attendance?.lateRange),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpace.sm),
          Row(
            children: [
              SizedBox(width: 96, child: Text('Даалгавар', style: dim)),
              Expanded(
                child: Wrap(
                  spacing: AppSpace.sm,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    HomeworkMarkView(status: hw.status),
                    if (hw.checkedOn != null && hw.status != null)
                      Text('${dayShort(hw.checkedOn!)} шалгасан', style: context.text.bodySmall),
                  ],
                ),
              ),
            ],
          ),
          if (hw.comment != null && hw.comment!.trim().isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            TeacherComment(text: hw.comment!),
          ],
        ],
      ),
    );
  }
}

/// Багшийн тайлбар — зүүн талын тодотгол зураастай (өнгөт дэвсгэргүй).
class TeacherComment extends StatelessWidget {
  const TeacherComment({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
      decoration: BoxDecoration(
        color: c.surfaceSunken,
        border: Border(left: BorderSide(color: c.brandBright, width: 3)),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Text(text, style: context.text.bodyMedium),
    );
  }
}

class _TestsCard extends StatelessWidget {
  const _TestsCard({required this.tests});

  final List<HubDayTest> tests;

  @override
  Widget build(BuildContext context) {
    if (tests.isEmpty) return const DashedNote('Энэ өдөр тест хийгээгүй');
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: AppSpace.xs),
      child: Column(children: [for (final t in tests) DayTestTile(test: t)]),
    );
  }
}

/// Тестийн мөр: нээгдсэн бол бодлого руу, маргааш нээгдэх бол тэмдэг, бусад үед зөвхөн нэр.
class DayTestTile extends StatelessWidget {
  const DayTestTile({super.key, required this.test});

  final HubDayTest test;

  @override
  Widget build(BuildContext context) {
    final title = cleanTitle(test.title, variant: test.variant, fallback: test.title);
    final open = test.testId != null && test.open;
    return ListTile(
      leading: Icon(AppIcons.exam, color: context.colors.brandSoft),
      title: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis),
      subtitle: test.variant == null ? null : Text('${test.variant} хувилбар'),
      trailing: open
          ? Icon(AppIcons.forward, size: 18, color: context.colors.inkDim)
          : (test.testId != null && test.closedReason == TestClosedReason.tomorrow)
          ? const InfoPill(label: 'Маргааш нээгдэнэ', icon: AppIcons.time)
          : null,
      onTap: open ? () => context.push('/app/my-class/tests/${Uri.encodeComponent(test.testId!)}') : null,
    );
  }
}

class _TheoryCard extends ConsumerWidget {
  const _TheoryCard({required this.day});

  final HubDay day;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final date = dayKeyOf(day.date);
    final key = (classroomId: day.classroomId, date: date);
    final theory = ref.watch(theoryDayProvider(key));
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          AsyncBody(
            value: theory,
            compactError: true,
            onRetry: () => ref.invalidate(theoryDayProvider(key)),
            loading: const SkeletonPulse(child: SkeletonLine(height: 96)),
            builder: (t) {
              if (t.photos.isEmpty) {
                return Text('Онолын зураг хараахан илгээгдээгүй', style: context.text.bodyMedium);
              }
              return Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  for (final set in t.photos) ...[
                    Row(
                      children: [
                        Expanded(
                          child: Text(set.isMine ? 'Миний илгээсэн' : set.uploaderName, style: context.text.titleSmall),
                        ),
                        if (set.isAssigned) const InfoPill(label: 'Томилогдсон'),
                      ],
                    ),
                    const SizedBox(height: AppSpace.sm),
                    PhotoStrip(keys: set.imageKeys, semanticPrefix: 'Онолын зураг'),
                    const SizedBox(height: AppSpace.md),
                  ],
                ],
              );
            },
          ),
          if (day.theory.canUpload) ...[
            const SizedBox(height: AppSpace.sm),
            OutlinedButton.icon(
              icon: const Icon(AppIcons.theoryPhoto, size: 18),
              label: Text(day.theory.mine ? 'Онолын зургаа засах' : 'Онол илгээх'),
              onPressed: () => context.push('/app/theory?date=$date&c=${Uri.encodeComponent(day.classroomId)}'),
            ),
          ],
        ],
      ),
    );
  }
}

class _HomeworkPhotoCard extends StatelessWidget {
  const _HomeworkPhotoCard({required this.day});

  final HubDay day;

  @override
  Widget build(BuildContext context) {
    final photo = day.homeworkPhoto;
    final uploaded = parseApiInstant(photo?.uploadedAt);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (photo != null)
            Row(
              children: [
                MarkIcon(MarkGlyph.hwSent, color: context.colors.success, size: 20),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: Meta(
                    items: ['Илгээсэн', '${photo.pages} хуудас', if (uploaded != null) DateMn.relative(uploaded)],
                    style: context.text.bodyMedium,
                  ),
                ),
              ],
            )
          else
            Text(
              day.canSendHomework ? 'Даалгаврын зураг илгээгээгүй байна' : 'Илгээх хугацаа өнгөрсөн',
              style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
            ),
          if (day.canSendHomework) ...[
            const SizedBox(height: AppSpace.md),
            OutlinedButton.icon(
              icon: const Icon(AppIcons.homework, size: 18),
              label: Text(photo == null ? 'Даалгавар илгээх' : 'Даалгавраа солих'),
              onPressed: () => context.push('/app/homework'),
            ),
          ],
        ],
      ),
    );
  }
}
