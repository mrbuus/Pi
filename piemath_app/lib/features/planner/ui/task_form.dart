import 'package:flutter/material.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/planner_models.dart';
import '../domain/planner_logic.dart';

/// Маягтын «сонгоогүй» утга (заавал биш сонголт).
const _none = '';

/// Даалгавар нэмэх, засах маягт (вэбийн `TaskFormModal`). Хадгалах дармагц маягт хаагдаж утгыг буцаана —
/// серверт илгээх нь optimistic (дуудагч `PlannerController`-оор). Хаавал `null`.
///
/// [parent] өгвөл дэд даалгавар нэмнэ.
Future<TaskDraft?> showTaskForm(
  BuildContext context, {
  StaffTask? initial,
  StaffTask? parent,
  required List<StaffMember> staff,
  required List<ClassroomRef> classrooms,
}) {
  final start = splitInstant(initial?.startDate);
  final due = splitInstant(initial?.dueDate);
  final title = initial != null
      ? 'Даалгавар засах'
      : parent != null
      ? 'Дэд даалгавар нэмэх'
      : 'Шинэ даалгавар';
  // Сонгогдсон ажилтан жагсаалтад байхгүй (жишээ нь эрх нь солигдсон) бол алдагдахгүй.
  final people = [
    ...staff,
    for (final a in initial?.assignees ?? const <StaffMember>[])
      if (!staff.contains(a)) a,
  ];
  final rooms = [
    ...classrooms,
    if (initial?.classroom != null && !classrooms.any((c) => c.id == initial!.classroom!.id)) initial!.classroom!,
  ];
  return showFormSheet<TaskDraft>(
    context,
    title: title,
    subtitle: parent == null ? null : 'Эцэг даалгавар: ${parent.title}',
    fields: [
      FormTextField(
        name: 'title',
        label: 'Гарчиг',
        initial: initial?.title,
        hint: 'Жишээ: 11-1 ангийн улирлын шалгалт бэлтгэх',
        required: true,
      ),
      FormTextField(name: 'description', label: 'Тайлбар', initial: initial?.description, maxLines: 3),
      FormSelectField<TaskStatus>(
        name: 'status',
        label: 'Төлөв',
        initial: initial?.status ?? TaskStatus.planned,
        required: true,
        options: [for (final s in TaskStatus.values) SelectOption(s, statusLabel(s))],
      ),
      FormSelectField<TaskPriority>(
        name: 'priority',
        label: 'Чухал зэрэг',
        initial: initial?.priority ?? TaskPriority.normal,
        required: true,
        options: [for (final p in TaskPriority.values) SelectOption(p, priorityLabel(p))],
      ),
      FormDateField(name: 'start', label: 'Эхлэх огноо', initial: start.day),
      FormDateField(name: 'due', label: 'Дуусах огноо', initial: due.day),
      FormTimeField(name: 'dueTime', label: 'Дуусах цаг (заавал биш)', initial: due.time),
      FormMultiSelectField<String>(
        name: 'assignees',
        label: 'Хариуцах ажилтан',
        initial: {for (final a in initial?.assignees ?? const <StaffMember>[]) a.id},
        options: [for (final s in people) SelectOption(s.id, memberName(s))],
      ),
      FormSelectField<String>(
        name: 'classroom',
        label: 'Анги (заавал биш)',
        initial: initial?.classroom?.id ?? _none,
        icon: AppIcons.classes,
        options: [
          const SelectOption(_none, 'Сонгоогүй'),
          for (final c in rooms) SelectOption(c.id, c.name.isEmpty ? 'Анги' : c.name),
        ],
      ),
      FormSelectField<String>(
        name: 'subject',
        label: 'Хичээл (заавал биш)',
        initial: initial?.subject?.api ?? _none,
        options: [
          const SelectOption(_none, 'Сонгоогүй'),
          SelectOption(TaskSubject.math.api, subjectLabel(TaskSubject.math)),
          SelectOption(TaskSubject.socialStudies.api, subjectLabel(TaskSubject.socialStudies)),
          if (initial?.subject == TaskSubject.sat) SelectOption(TaskSubject.sat.api, subjectLabel(TaskSubject.sat)),
        ],
      ),
      FormNumberField(
        name: 'hours',
        label: 'Тооцоолсон цаг (заавал биш)',
        initial: initial?.estimateHours,
        suffixText: 'цаг',
        min: 0,
      ),
    ],
    onSubmit: (v) async => draftFromForm(v, parentTaskId: parent?.id ?? initial?.parentTaskId),
  );
}

/// Маягтын утгаас [TaskDraft] (талбар хоорондын алдаа бол [ApiError] — маягт дотор харагдана).
TaskDraft draftFromForm(FormValues v, {String? parentTaskId}) {
  final startDay = v.date('start');
  final dueDay = v.date('due');
  final dueTime = v.time('dueTime');
  final hours = v.integer('hours');
  final error = validateTaskForm(
    title: v.text('title'),
    startDay: startDay,
    dueDay: dueDay,
    dueTime: dueTime,
    estimateHours: hours,
  );
  if (error != null) throw ApiError(ApiErrorKind.badRequest, error);
  final due = composeInstant(dueDay, dueTime);
  final classroom = v.get<String>('classroom');
  final subject = v.get<String>('subject');
  return TaskDraft(
    title: v.text('title'),
    description: v.text('description'),
    status: v.get<TaskStatus>('status') ?? TaskStatus.planned,
    priority: v.get<TaskPriority>('priority') ?? TaskPriority.normal,
    startDate: composeStart(startDay, due),
    dueDate: due,
    classroomId: classroom == null || classroom == _none ? null : classroom,
    subject: TaskSubject.fromApi(subject),
    estimateHours: hours,
    assigneeIds: v.many<String>('assignees').toList(),
    parentTaskId: parentTaskId,
  );
}

/// Шүүлтүүрийн маягт (вэбийн «Ажилтнаар / Ангиар / Хичээлээр шүүх»).
Future<({String? assigneeId, String? classroomId, TaskSubject? subject})?> showPlannerFilterSheet(
  BuildContext context, {
  required ({String? assigneeId, String? classroomId, TaskSubject? subject}) current,
  required List<StaffMember> staff,
  required List<ClassroomRef> classrooms,
}) {
  return showFormSheet(
    context,
    title: 'Шүүлтүүр',
    submitLabel: 'Хэрэглэх',
    initialSize: FormSheet.midSize,
    fields: [
      FormSelectField<String>(
        name: 'assignee',
        label: 'Ажилтан',
        initial: current.assigneeId ?? _none,
        icon: AppIcons.user,
        options: [const SelectOption(_none, 'Бүгд'), for (final s in staff) SelectOption(s.id, memberName(s))],
      ),
      FormSelectField<String>(
        name: 'classroom',
        label: 'Анги',
        initial: current.classroomId ?? _none,
        icon: AppIcons.classes,
        options: [const SelectOption(_none, 'Бүгд'), for (final c in classrooms) SelectOption(c.id, c.name)],
      ),
      FormSelectField<String>(
        name: 'subject',
        label: 'Хичээл',
        initial: current.subject?.api ?? _none,
        options: [
          const SelectOption(_none, 'Бүгд'),
          SelectOption(TaskSubject.math.api, subjectLabel(TaskSubject.math)),
          SelectOption(TaskSubject.socialStudies.api, subjectLabel(TaskSubject.socialStudies)),
        ],
      ),
    ],
    onSubmit: (v) async {
      String? pick(String name) {
        final x = v.get<String>(name);
        return x == null || x == _none ? null : x;
      }

      return (
        assigneeId: pick('assignee'),
        classroomId: pick('classroom'),
        subject: TaskSubject.fromApi(pick('subject')),
      );
    },
  );
}
