import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_error.dart';
import '../../../../core/time/date_mn.dart';
import '../../../../core/time/ub_time.dart';
import '../../../../core/time/weekday.dart';
import '../../../../shared/native/native.dart';
import '../../data/schedule_repository.dart';
import '../../data/staff_schedule_models.dart';
import '../../data/staff_schedule_repository.dart';
import '../../domain/day_overlay.dart';
import '../../domain/staff_schedule_logic.dart';

// Хичээлийн үйлдлүүд (вэбийн `EntryActionPanel`, `pattern/AddSlotDialog`, `TeacherWorkDays`, `CalendarAdmin`).
// Маягт бүр `showFormSheet`, устгах/цуцлах нь `confirmAction` + «Буцаах» (`showUndoSnack`) — серверт зөвхөн
// 5 секундын дараа илгээнэ. Await-ийн дараа widget хаагдсан байж болох тул `ProviderContainer`-оор уншина.

ProviderContainer _c(BuildContext context) => ProviderScope.containerOf(context, listen: false);

ApiError _invalid(String message) => ApiError(ApiErrorKind.badRequest, message);

void _snack(ScaffoldMessengerState? m, String text) => m
  ?..hideCurrentSnackBar()
  ..showSnackBar(SnackBar(content: Text(text)));

String _errorText(Object e) => e is ApiError ? e.message : MutationResult.saveFailedMessage;

/// Хуваарь өөрчлөгдсөний дараа хамаатай кэшийг шинэчилнэ.
void refreshSchedule(ProviderContainer c) {
  c
    ..invalidate(dayPlanProvider)
    ..invalidate(scheduleWeekProvider)
    ..invalidate(patternSlotsProvider)
    ..invalidate(publicationProvider);
}

/// Танхимын сонголт (салбараар, суудлын тоотой). [allowNone] бол «Танхимгүй» (утга '').
List<SelectOption<String>> roomOptions({bool allowNone = false, String? current}) => [
  if (allowNone) const SelectOption('', 'Танхимгүй'),
  if (current != null && current.isNotEmpty && rooms.every((r) => r.value != current))
    SelectOption(current, current, subtitle: 'Жагсаалтад алга'),
  for (final r in rooms)
    SelectOption(r.value, r.value, subtitle: [r.branch, if (r.capacity != null) '${r.capacity} суудал'].join(', ')),
];

/// Гараг (харуулах дараалал Даваа → Ням), утга нь JS дугаарлалт.
List<SelectOption<int>> weekdayOptions({bool short = false}) => [
  for (var mn = 1; mn <= 7; mn++) SelectOption(jsWeekdayFromMn(mn), short ? weekdayShortMn(mn) : weekdayNameMn(mn)),
];

Future<List<SelectOption<String>>> _teacherOptions(ProviderContainer c, {required String noneLabel}) async {
  final teachers = await c.read(teacherOptionsProvider.future);
  final sorted = [...teachers]..sort((a, b) => teacherLabel(a).compareTo(teacherLabel(b)));
  return [SelectOption('', noneLabel), for (final t in sorted) SelectOption(t.id, teacherLabel(t))];
}

String _sameTimeText(DayLesson lesson, List<DayLesson> day) {
  final others = sameTime(lesson, day);
  if (others.isEmpty) return '';
  return 'Энэ цагт: ${others.map((o) => [?o.room, shortClass(o.classroomName)].join(' ')).join(', ')}';
}

// ---------------------------------------------------------------------------
// Өдрийн хичээл
// ---------------------------------------------------------------------------

/// «Танхим солих»: зөвхөн энэ өдөр (MOVED) эсвэл энэ өдрөөс хойш байнга (split).
Future<bool> changeRoom(BuildContext context, {required DayLesson lesson, required List<DayLesson> day}) async {
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final hint = _sameTimeText(lesson, day);
  final done = await showFormSheet<bool>(
    context,
    title: 'Танхим солих',
    subtitle: ['Одоо: ${lesson.room ?? 'тодорхойгүй'}', if (hint.isNotEmpty) hint].join('\n'),
    submitLabel: 'Танхим солих',
    fields: [
      FormSelectField<String>(
        name: 'room',
        label: 'Шинэ танхим',
        options: roomOptions(current: lesson.room),
        initial: lesson.room,
        required: true,
      ),
      FormSelectField<String>(
        name: 'scope',
        label: 'Хамрах хүрээ',
        initial: 'once',
        required: true,
        options: [
          SelectOption('once', 'Зөвхөн энэ өдөр', subtitle: lesson.occurrenceDate),
          const SelectOption('always', 'Энэ өдрөөс хойш байнга', subtitle: 'Өнгөрсөн түүх хэвээр үлдэнэ'),
        ],
      ),
    ],
    onSubmit: (v) async {
      final room = v.get<String>('room')!;
      if (room == lesson.room) throw _invalid('Одоогийн танхимтай ижил байна, өөр танхим сонгоно уу');
      if (v.get<String>('scope') == 'always') {
        await repo.splitSeries(
          lesson.scheduleId,
          from: lesson.occurrenceDate,
          weekday: jsWeekdayOf(dayOf(lesson.occurrenceDate)),
          startMinute: lesson.startMinute,
          endMinute: lesson.endMinute,
          room: room,
          teacherId: lesson.teacherId,
        );
      } else {
        await repo.moveOccurrence(
          lesson.scheduleId,
          date: lesson.occurrenceDate,
          startMinute: lesson.startMinute,
          endMinute: lesson.endMinute,
          room: room,
          note: 'Танхим сольсон',
        );
      }
      return true;
    },
  );
  if (done != true) return false;
  refreshSchedule(c);
  return true;
}

/// «Зөөх»: зөвхөн энэ өдрийн хичээлийг өөр огноо, цаг, танхим руу.
Future<bool> moveLesson(
  BuildContext context, {
  required DayLesson lesson,
  required String date,
  required List<DayLesson> day,
}) async {
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final duration = lesson.endMinute - lesson.startMinute;
  final hint = _sameTimeText(lesson, day);
  final done = await showFormSheet<bool>(
    context,
    title: 'Хичээл зөөх',
    subtitle: hint.isEmpty ? null : hint,
    submitLabel: 'Зөөх',
    fields: [
      FormDateField(name: 'date', label: 'Шинэ огноо', initial: dayOf(date), required: true),
      FormTimeField(name: 'start', label: 'Шинэ эхлэх цаг', initial: timeOfMinutes(lesson.startMinute), required: true),
      FormSelectField<String>(
        name: 'room',
        label: 'Шинэ танхим (заавал биш)',
        options: roomOptions(allowNone: true, current: lesson.room),
        initial: lesson.room ?? '',
      ),
      const FormTextField(name: 'note', label: 'Тэмдэглэл (заавал биш)', hint: 'Жишээ: Багшийн хүсэлтээр'),
    ],
    onSubmit: (v) async {
      final start = minutesOf(v.time('start')!);
      final end = endAfter(start, duration);
      if (start >= end) throw _invalid('Дуусах цаг эхлэх цагаас хойш байх ёстой');
      final newDate = v.date('date')!.dateKey;
      final room = v.get<String>('room') ?? '';
      final note = v.text('note');
      await repo.moveOccurrence(
        lesson.scheduleId,
        date: lesson.occurrenceDate,
        newDate: newDate == date ? null : newDate,
        startMinute: start,
        endMinute: end,
        room: room.isEmpty ? null : room,
        note: note.isEmpty ? null : note,
      );
      return true;
    },
  );
  if (done != true) return false;
  refreshSchedule(c);
  return true;
}

/// «Энэ ба цаашдын бүх»: [from]-оос эхлэн гараг, цаг, танхим, багшийг солино. Өнгөрсөн түүх хэвээр.
Future<bool> splitSeriesForm(
  BuildContext context, {
  required String scheduleId,
  required String from,
  required int weekday,
  required int startMinute,
  required int endMinute,
  String? room,
  String? teacherId,
  bool askFrom = false,
}) async {
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final messenger = ScaffoldMessenger.maybeOf(context);
  final List<SelectOption<String>> teachers;
  try {
    teachers = await _teacherOptions(c, noneLabel: 'Ангийн үндсэн багш');
  } catch (e) {
    _snack(messenger, _errorText(e));
    return false;
  }
  if (!context.mounted) return false;
  final duration = endMinute - startMinute;
  final done = await showFormSheet<bool>(
    context,
    title: 'Энэ ба цаашдын бүх',
    subtitle: askFrom ? 'Сонгосон өдрөөс хойшх бүх 7 хоногт үйлчилнэ' : '$from-ээс эхлэн шинэ тохиргоо үйлчилнэ',
    fields: [
      if (askFrom) FormDateField(name: 'from', label: 'Хэзээнээс', initial: dayOf(from), required: true),
      FormSelectField<int>(
        name: 'weekday',
        label: 'Гараг',
        options: weekdayOptions(),
        initial: weekday,
        required: true,
      ),
      FormTimeField(name: 'start', label: 'Эхлэх цаг', initial: timeOfMinutes(startMinute), required: true),
      FormSelectField<String>(
        name: 'room',
        label: 'Танхим',
        options: roomOptions(allowNone: true, current: room),
        initial: room ?? '',
      ),
      FormSelectField<String>(name: 'teacher', label: 'Багш', options: teachers, initial: teacherId ?? ''),
    ],
    onSubmit: (v) async {
      final start = minutesOf(v.time('start')!);
      final end = endAfter(start, duration);
      if (start >= end) throw _invalid('Дуусах цаг эхлэх цагаас хойш байх ёстой');
      final r = v.get<String>('room') ?? '';
      final t = v.get<String>('teacher') ?? '';
      await repo.splitSeries(
        scheduleId,
        from: askFrom ? v.date('from')!.dateKey : from,
        weekday: v.get<int>('weekday')!,
        startMinute: start,
        endMinute: end,
        // Хоосныг null — сервер «цэвэрлэ» гэж ойлгоно.
        room: r.isEmpty ? null : r,
        teacherId: t.isEmpty ? null : t,
      );
      return true;
    },
  );
  if (done != true) return false;
  refreshSchedule(c);
  return true;
}

/// Сэдэв бичих (Багш+, Админ).
Future<bool> editTopic(BuildContext context, {required DayLesson lesson}) async {
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final done = await showFormSheet<bool>(
    context,
    title: 'Сэдэв',
    fields: [FormTextField(name: 'title', label: 'Сэдвийн нэр', initial: lesson.topic, required: true, maxLength: 200)],
    onSubmit: (v) async {
      await repo.setTopic(lesson.scheduleId, date: lesson.occurrenceDate, title: v.text('title'));
      return true;
    },
  );
  if (done != true) return false;
  refreshSchedule(c);
  return true;
}

/// Сэдэв хасах — «Буцаах» дарвал хуучин сэдвийг сэргээнэ.
Future<void> clearTopic(BuildContext context, {required DayLesson lesson}) async {
  final old = lesson.topic;
  if (old == null) return;
  if (!await confirmAction(context, title: 'Сэдвийг хасах уу', message: old, confirmLabel: 'Хасах')) return;
  if (!context.mounted) return;
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final messenger = ScaffoldMessenger.maybeOf(context);
  try {
    await repo.clearTopic(lesson.scheduleId, date: lesson.occurrenceDate);
  } catch (e) {
    _snack(messenger, _errorText(e));
    return;
  }
  refreshSchedule(c);
  if (!context.mounted) return;
  if (await showUndoSnack(context, message: 'Сэдэв хасагдлаа')) {
    try {
      await repo.setTopic(lesson.scheduleId, date: lesson.occurrenceDate, title: old);
      refreshSchedule(c);
    } catch (e) {
      _snack(messenger, _errorText(e));
    }
  }
}

/// Ахлах эсвэл туслах багш оноох — ажиллах багш нар эхэнд. Optimistic: шууд харагдаж, алдаа бол буцна.
Future<void> assignStaff(
  BuildContext context, {
  required DayLesson lesson,
  required String date,
  required bool lead,
  required DayPlan plan,
}) async {
  final c = _c(context);
  final messenger = ScaffoldMessenger.maybeOf(context);
  final List<TeacherOption> all;
  try {
    all = await c.read(teacherOptionsProvider.future);
  } catch (e) {
    _snack(messenger, _errorText(e));
    return;
  }
  if (!context.mounted) return;
  final working = {for (final t in plan.rosterTeachers) t.id};
  final names = <String, StaffRef>{
    for (final t in plan.rosterTeachers) t.id: t,
    for (final t in all) t.id: StaffRef(id: t.id, name: t.displayName ?? t.firstName, role: t.role),
  };
  final ordered = names.values.toList()
    ..sort((a, b) {
      final w = (working.contains(a.id) ? 0 : 1).compareTo(working.contains(b.id) ? 0 : 1);
      return w != 0 ? w : staffRefLabel(a).compareTo(staffRefLabel(b));
    });
  final current = lead ? lesson.lead : lesson.assistant;
  final workingLabel = date == plan.today ? 'Өнөөдөр ажиллах' : 'Энэ өдөр ажиллах';
  final picked = await showSelectSheet<String>(
    context,
    title: lead ? 'Ахлах багш' : 'Туслах багш',
    selected: current?.id ?? '',
    options: [
      const SelectOption('', 'Оноогоогүй'),
      for (final t in ordered)
        SelectOption(t.id, staffRefLabel(t), subtitle: working.contains(t.id) ? workingLabel : null),
    ],
  );
  if (picked == null || picked.value == (current?.id ?? '') || !context.mounted) return;
  final person = picked.value.isEmpty ? null : names[picked.value];
  final nextLead = lead ? person : lesson.lead;
  final nextAssistant = lead ? lesson.assistant : person;
  final key = lessonKey(date, lesson.scheduleId);
  final overlay = c.read(dayOverlayProvider.notifier);
  final repo = c.read(staffScheduleRepositoryProvider);
  final result = await overlay.patchStaff(
    key,
    lead: nextLead,
    assistant: nextAssistant,
    commit: () => repo.setStaffing(
      lesson.scheduleId,
      date: lesson.occurrenceDate,
      leadId: nextLead?.id,
      assistantId: nextAssistant?.id,
    ),
  );
  if (result.isOk) {
    // Шинэ өгөгдөл ирсний дараа л давхаргыг арилгана (хуучин нэр анивчихгүй).
    try {
      await c.refresh(dayPlanProvider(date).future);
    } catch (_) {}
    overlay.clearStaff(key);
  } else if (context.mounted) {
    showMutationError(context, result);
  }
}

/// «Цуцлах» — зөвхөн энэ өдөр. Нуугаад 5 сек «Буцаах», дараа нь серверт.
/// [afterConfirm] — баталгаажсаны дараа (жишээ нь хуудсыг хаах); «Буцаах»-ыг [host] дээр харуулна.
Future<void> cancelLesson(
  BuildContext context, {
  required DayLesson lesson,
  required String date,
  VoidCallback? afterConfirm,
  BuildContext? host,
}) async {
  final ok = await confirmAction(
    context,
    title: 'Энэ өдрийн хичээлийг цуцлах уу',
    message:
        '${shortClass(lesson.classroomName)}, ${DateMn.longWithWeekday(dayOf(date))}, ${formatMinutes(lesson.startMinute)}',
    confirmLabel: 'Цуцлах',
  );
  if (!ok) return;
  afterConfirm?.call();
  final target = host ?? context;
  if (!target.mounted) return;
  await _hideThenCommit(
    target,
    key: lessonKey(date, lesson.scheduleId),
    message: 'Хичээл цуцлагдлаа',
    commit: (repo) => repo.cancelOccurrence(lesson.scheduleId, date: lesson.occurrenceDate),
  );
}

/// «Устгах» — бүх 7 хоногийн давтамж. Нуугаад 5 сек «Буцаах», дараа нь серверт.
Future<void> deleteLessonSeries(
  BuildContext context, {
  required DayLesson lesson,
  required String date,
  VoidCallback? afterConfirm,
  BuildContext? host,
}) async {
  final ok = await confirmAction(
    context,
    title: 'Хичээлийг бүх 7 хоногоос устгах уу',
    message: 'БҮХ долоо хоногийн тохиолдол устана',
  );
  if (!ok) return;
  afterConfirm?.call();
  final target = host ?? context;
  if (!target.mounted) return;
  await _hideThenCommit(
    target,
    key: lessonKey(date, lesson.scheduleId),
    message: 'Хичээл устгагдлаа',
    commit: (repo) => repo.deleteSeries(lesson.scheduleId),
  );
}

Future<void> _hideThenCommit(
  BuildContext context, {
  required String key,
  required String message,
  required Future<void> Function(StaffScheduleRepository repo) commit,
}) async {
  final c = _c(context);
  final overlay = c.read(dayOverlayProvider.notifier);
  final repo = c.read(staffScheduleRepositoryProvider);
  final messenger = ScaffoldMessenger.maybeOf(context);
  overlay.hide(key);
  if (await showUndoSnack(context, message: message)) {
    overlay.unhide(key);
    return;
  }
  try {
    await commit(repo);
  } catch (e) {
    overlay.unhide(key);
    _snack(messenger, _errorText(e));
    return;
  }
  refreshSchedule(c);
  try {
    await c.read(dayPlanProvider(key.split('|').first).future);
  } catch (_) {}
  overlay.unhide(key);
}

/// «Нийтлэх» — тэр өдөр хичээлтэй багш, сурагчдад мэдэгдэл (дахин дарвал «өөрчлөгдлөө»).
Future<void> publishDay(BuildContext context, {required String date, required bool again}) async {
  final ok = await confirmAction(
    context,
    title: again ? 'Өөрчлөлт илгээх үү' : 'Өдрийн хуваарийг нийтлэх үү',
    message: 'Тэр өдөр хичээлтэй багш, сурагчдад мэдэгдэл очно',
    confirmLabel: 'Илгээх',
    destructive: false,
  );
  if (!ok || !context.mounted) return;
  final c = _c(context);
  final messenger = ScaffoldMessenger.maybeOf(context);
  try {
    final r = await c.read(staffScheduleRepositoryProvider).publishDay(date);
    c.invalidate(publicationProvider(date));
    _snack(messenger, 'Нийтэллээ, ${r.recipients} хүнд очсон');
  } catch (e) {
    _snack(messenger, _errorText(e));
  }
}

// ---------------------------------------------------------------------------
// Тогтмол хуваарь
// ---------------------------------------------------------------------------

/// «Шинэ цаг нэмэх» — сонгосон гарагуудад 7 хоног бүр ижил цагт.
/// [weekday] (JS) ба [start] — өдрийн хуваарийн хоосон цаг дээр дарсан бол урьдчилан бөглөнө.
Future<bool> addSlot(BuildContext context, {required StaffPermissions perms, int? weekday, UbDateTime? start}) async {
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final messenger = ScaffoldMessenger.maybeOf(context);
  final List<ClassroomOption> classes;
  final List<SelectOption<String>> teachers;
  try {
    classes = (await c.read(classroomOptionsProvider.future)).where((x) => perms.canManage(x.id)).toList()
      ..sort((a, b) => a.name.compareTo(b.name));
    teachers = await _teacherOptions(c, noneLabel: 'Ангийн багш');
  } catch (e) {
    _snack(messenger, _errorText(e));
    return false;
  }
  if (!context.mounted) return false;
  final today = UbDateTime.now().startOfDay;
  final done = await showFormSheet<bool>(
    context,
    title: 'Шинэ цаг нэмэх',
    subtitle: '7 хоног бүр сонгосон гарагуудад ижил цагт давтагдана',
    fields: [
      FormSelectField<String>(
        name: 'class',
        label: 'Анги',
        required: true,
        options: [
          for (final x in classes)
            SelectOption(
              x.id,
              shortClass(x.name),
              subtitle: [branchOf(x.name), if (x.students != null) '${x.students} сурагч'].join(', '),
            ),
        ],
      ),
      FormMultiSelectField<int>(
        name: 'days',
        label: 'Гараг',
        options: weekdayOptions(short: true),
        initial: {?weekday},
        required: true,
      ),
      FormTimeField(
        name: 'start',
        label: 'Эхлэх цаг',
        initial: start == null ? null : TimeOfDay(hour: start.hour, minute: start.minute),
        required: true,
      ),
      const FormNumberField(
        name: 'minutes',
        label: 'Үргэлжлэх',
        initial: lessonMinutes,
        suffixText: 'мин',
        min: 30,
        max: 300,
        required: true,
      ),
      FormSelectField<String>(name: 'room', label: 'Танхим', options: roomOptions(allowNone: true), initial: ''),
      FormSelectField<String>(name: 'teacher', label: 'Багш', options: teachers, initial: ''),
      FormSelectField<String>(
        name: 'subject',
        label: 'Хичээл',
        initial: '',
        options: [
          const SelectOption('', 'Заагаагүй'),
          for (final MapEntry(:key, :value) in subjectLabels.entries) SelectOption(key, value),
        ],
      ),
      FormDateField(name: 'from', label: 'Эхлэх огноо', initial: today, required: true),
      const FormDateField(name: 'to', label: 'Дуусах огноо (заавал биш)'),
    ],
    onSubmit: (v) async {
      final start = minutesOf(v.time('start')!);
      final end = endAfter(start, v.integer('minutes') ?? lessonMinutes);
      if (start >= end) throw _invalid('Дуусах цаг эхлэх цагаас хойш байх ёстой');
      final from = v.date('from')!;
      final to = v.date('to');
      if (to != null && to.compareTo(from) < 0) throw _invalid('Дуусах огноо эхлэхээс хойш байх ёстой');
      final room = v.get<String>('room') ?? '';
      final teacher = v.get<String>('teacher') ?? '';
      final subject = v.get<String>('subject') ?? '';
      await repo.bulkCreate(
        classroomId: v.get<String>('class')!,
        weekdays: (v.many<int>('days').toList()..sort()),
        startMinute: start,
        endMinute: end,
        effectiveFrom: from.dateKey,
        effectiveTo: to?.dateKey,
        room: room.isEmpty ? null : room,
        teacherId: teacher.isEmpty ? null : teacher,
        subject: subject.isEmpty ? null : subject,
      );
      return true;
    },
  );
  if (done != true) return false;
  refreshSchedule(c);
  _snack(messenger, 'Цаг нэмэгдлээ');
  return true;
}

/// Тогтмол хуваарийн мөр устгах — «Буцаах» хугацаанд [onHide]/[onUnhide]-аар нууна.
Future<void> deletePatternSlot(
  BuildContext context, {
  required PatternSlot slot,
  required VoidCallback onHide,
  required VoidCallback onUnhide,
}) async {
  final ok = await confirmAction(
    context,
    title: 'Хичээлийг бүх 7 хоногоос устгах уу',
    message: 'БҮХ долоо хоногийн тохиолдол устана',
  );
  if (!ok || !context.mounted) return;
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final messenger = ScaffoldMessenger.maybeOf(context);
  onHide();
  if (await showUndoSnack(context, message: 'Хичээл устгагдлаа')) {
    onUnhide();
    return;
  }
  try {
    await repo.deleteSeries(slot.id);
    refreshSchedule(c);
    await c.read(patternSlotsProvider.future);
  } catch (e) {
    _snack(messenger, _errorText(e));
  } finally {
    onUnhide();
  }
}

// ---------------------------------------------------------------------------
// Багшийн ажлын өдөр
// ---------------------------------------------------------------------------

/// Хүснэгтийн горим (Тогтмол / Сондгой-Тэгш) ба хүчинтэй хугацаа.
Future<bool> editRosterConfig(BuildContext context, {required RosterConfig config}) async {
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final done = await showFormSheet<bool>(
    context,
    title: 'Хүснэгтийн тохиргоо',
    fields: [
      FormSelectField<String>(
        name: 'mode',
        label: 'Хүснэгтийн төрөл',
        initial: config.mode,
        required: true,
        options: const [
          SelectOption('FIXED', 'Тогтмол', subtitle: '7 хоног бүр ижил'),
          SelectOption('ALTERNATING', 'Сондгой / Тэгш', subtitle: 'Ээлжит 7 хоног'),
        ],
      ),
      FormDateField(name: 'from', label: 'Хүчинтэй эхлэх', initial: parseDateKey(config.validFrom)),
      FormDateField(name: 'to', label: 'Дуусах', initial: parseDateKey(config.validTo)),
    ],
    onSubmit: (v) async {
      final from = v.date('from');
      final to = v.date('to');
      if (from != null && to != null && from.compareTo(to) > 0) throw _invalid('Эхлэх огноо дуусахаас хойш байна');
      await repo.putRosterConfig(mode: v.get<String>('mode')!, validFrom: from?.dateKey, validTo: to?.dateKey);
      return true;
    },
  );
  if (done != true) return false;
  c
    ..invalidate(workDaysProvider)
    ..invalidate(dayPlanProvider);
  return true;
}

/// Нэг өдрийн онцгой тохиолдол (чөлөө, нэмэлт ажлын өдөр).
Future<bool> addWorkException(
  BuildContext context, {
  required List<({String id, String name})> teachers,
  required UbDateTime initialDate,
}) async {
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final done = await showFormSheet<bool>(
    context,
    title: 'Онцгой өдөр бүртгэх',
    submitLabel: 'Бүртгэх',
    fields: [
      FormSelectField<String>(
        name: 'teacher',
        label: 'Багш',
        required: true,
        options: [for (final t in teachers) SelectOption(t.id, t.name)],
      ),
      FormDateField(name: 'date', label: 'Огноо', initial: initialDate, required: true),
      const FormSelectField<bool>(
        name: 'working',
        label: 'Тухайн өдөр',
        initial: false,
        required: true,
        options: [SelectOption(true, 'Ажиллана'), SelectOption(false, 'Ажиллахгүй')],
      ),
      const FormTextField(name: 'note', label: 'Тэмдэглэл', hint: 'Чөлөө'),
    ],
    onSubmit: (v) async {
      final note = v.text('note');
      await repo.addWorkException(
        teacherId: v.get<String>('teacher')!,
        date: v.date('date')!.dateKey,
        working: v.get<bool>('working')!,
        note: note.isEmpty ? null : note,
      );
      return true;
    },
  );
  if (done != true) return false;
  c
    ..invalidate(workDaysProvider)
    ..invalidate(dayPlanProvider);
  return true;
}

// ---------------------------------------------------------------------------
// Онцгой өдөр
// ---------------------------------------------------------------------------

/// Онцгой өдөр нэмэх ([day] null) эсвэл засах. Нэмэхэд олон өдрийн амралт (сүүлийн өдөр) болно.
Future<bool> editSpecialDay(BuildContext context, {SpecialDay? day}) async {
  final c = _c(context);
  final repo = c.read(staffScheduleRepositoryProvider);
  final messenger = ScaffoldMessenger.maybeOf(context);
  final List<ClassroomOption> classes;
  try {
    classes = [...await c.read(classroomOptionsProvider.future)]..sort((a, b) => a.name.compareTo(b.name));
  } catch (e) {
    _snack(messenger, _errorText(e));
    return false;
  }
  if (!context.mounted) return false;
  final done = await showFormSheet<bool>(
    context,
    title: day == null ? 'Онцгой өдөр нэмэх' : 'Онцгой өдөр засах',
    fields: [
      FormDateField(
        name: 'date',
        label: day == null ? 'Эхний өдөр' : 'Огноо',
        initial: parseDateKey(day?.date) ?? UbDateTime.now().startOfDay,
        required: true,
      ),
      if (day == null) const FormDateField(name: 'end', label: 'Сүүлийн өдөр (олон өдөр бол)'),
      FormSelectField<String>(
        name: 'type',
        label: 'Төрөл',
        initial: day?.type ?? 'HOLIDAY',
        required: true,
        options: [for (final MapEntry(:key, :value) in calendarTypes.entries) SelectOption(key, value)],
      ),
      FormTextField(name: 'title', label: 'Гарчиг', initial: day?.title, required: true, maxLength: 120),
      FormTextField(name: 'note', label: 'Тэмдэглэл', initial: day?.note, maxLines: 3),
      FormSwitchField(name: 'all', label: 'Бүх анги', initial: day == null || day.classroomIds.isEmpty),
      FormMultiSelectField<String>(
        name: 'classes',
        label: 'Хамаарах ангиуд',
        initial: {...?day?.classroomIds},
        options: [for (final x in classes) SelectOption(x.id, shortClass(x.name))],
      ),
    ],
    onSubmit: (v) async {
      final all = v.boolean('all');
      final ids = all ? <String>[] : v.many<String>('classes').toList();
      if (!all && ids.isEmpty) throw _invalid('Хамаарах ангиа сонгоно уу, эсвэл «Бүх анги»-г сонгоно уу');
      final start = v.date('date')!;
      final end = v.date('end');
      if (end != null && end.compareTo(start) < 0) throw _invalid('Сүүлийн өдөр эхний өдрөөс хойш байх ёстой');
      final note = v.text('note');
      if (day != null) {
        await repo.updateSpecialDay(
          day.id,
          date: start.dateKey,
          type: v.get<String>('type')!,
          title: v.text('title'),
          note: note.isEmpty ? null : note,
          classroomIds: ids,
        );
        return true;
      }
      final last = end ?? start;
      var done = 0;
      for (var d = start; d.compareTo(last) <= 0; d = d.addDays(1)) {
        try {
          await repo.createSpecialDay(
            date: d.dateKey,
            type: v.get<String>('type')!,
            title: v.text('title'),
            note: note.isEmpty ? null : note,
            classroomIds: ids,
          );
        } on ApiError catch (e) {
          if (done > 0) refreshSchedule(c);
          throw ApiError(e.kind, done > 0 ? '${DateMn.long(d)}: ${e.message} ($done өдөр нэмэгдсэн)' : e.message);
        }
        done++;
      }
      return true;
    },
  );
  if (done != true) return false;
  c.invalidate(specialDaysProvider);
  refreshSchedule(c);
  return true;
}
