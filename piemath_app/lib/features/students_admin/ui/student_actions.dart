import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../teacher/application/teacher_providers.dart';
import '../../teacher/ui/student_info_tab.dart';
import '../application/students_admin_providers.dart';
import '../data/students_admin_models.dart';
import '../data/students_admin_repository.dart';
import '../domain/students_perms.dart';
import 'withdrawal_sheet.dart';

/// Сурагчийн үйлдэл (вэбийн `StudentActions.tsx`): анги солих, сургалтаас хасах, архивлах, сэргээх, засах.
/// Жагсаалт, дэлгэрэнгүй хоёулаа эдгээрийг дуудна. Бүгд зөөлөн, аудиттай серверийн endpoint — устгах алга.
enum StudentAction {
  moveClass('Анги солих', AppIcons.repeat),
  withdraw('Сургалтаас хасах', AppIcons.circleMinus),
  archive('Тооцоогүй архивлах', AppIcons.ban),
  restore('Сэргээх', AppIcons.restart),
  editProfile('Мэдээлэл засах', AppIcons.draft),
  editRegistration('Бүртгэл, төлбөрийн багц', AppIcons.idCard),
  open('Хуудсыг нээх', AppIcons.user);

  const StudentAction(this.label, this.icon);

  final String label;
  final IconData icon;
}

/// Эрх, төлөвт тохирох үйлдлүүд (вэб: идэвхтэй — анги солих, хасах; архив — сэргээх).
List<StudentAction> availableActions(StudentsPerms perms, {required bool archived, bool includeOpen = false}) => [
  if (includeOpen) StudentAction.open,
  if (perms.canManage && !archived) ...[
    StudentAction.moveClass,
    if (perms.canWithdraw) StudentAction.withdraw,
    StudentAction.archive,
  ],
  if (perms.canManage && archived) StudentAction.restore,
  if (perms.canEditProfile('STUDENT')) ...[StudentAction.editProfile, StudentAction.editRegistration],
];

Future<StudentAction?> pickStudentAction(
  BuildContext context, {
  required String name,
  required List<StudentAction> actions,
}) async {
  final picked = await showSelectSheet<StudentAction>(
    context,
    title: name,
    options: [for (final a in actions) SelectOption(a, a.label, icon: a.icon)],
  );
  return picked?.value;
}

/// Сурагчийн өгөгдөл өөрчлөгдсөний дараа холбогдох кэшийг шинэчилнэ (жагсаалт, дэлгэрэнгүй, тооцоо).
void invalidateStudent(WidgetRef ref, String id, {bool list = true}) {
  ref.invalidate(adminStudentDetailProvider(id));
  ref.invalidate(studentDetailProvider(id));
  ref.invalidate(studentPaymentHistoryProvider(id));
  ref.invalidate(studentWithdrawalsProvider(id));
  if (list) ref.read(studentsListVersionProvider.notifier).bump();
}

void _snack(BuildContext context, String message) {
  final m = ScaffoldMessenger.maybeOf(context);
  m
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

String _err(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;

Future<List<ClassroomRef>?> _classes(BuildContext context, WidgetRef ref) async {
  try {
    return await ref.read(adminClassroomsProvider.future);
  } catch (e) {
    if (context.mounted) _snack(context, _err(e, 'Ангиудыг ачаалж чадсангүй'));
    return null;
  }
}

SelectOption<String> _classOption(ClassroomRef c) =>
    SelectOption(c.id, c.name, subtitle: c.students == null ? null : '${c.students} сурагч');

/// Анги солих (`POST /classrooms/:id/enroll`). Хуучин ангийн дүн, ирц түүхэнд үлдэнэ.
Future<String?> changeClass(
  BuildContext context,
  WidgetRef ref, {
  required String studentId,
  required String name,
  String? currentClassId,
}) async {
  final rooms = await _classes(context, ref);
  if (rooms == null || !context.mounted) return null;
  final options = [
    for (final c in rooms)
      if (c.id != currentClassId) _classOption(c),
  ];
  final target = await showFormSheet<String>(
    context,
    title: 'Анги солих',
    subtitle: '$name. Хуучин ангийн дүн, ирц түүхэнд үлдэнэ',
    submitLabel: 'Шилжүүлэх',
    fields: [FormSelectField<String>(name: 'class', label: 'Шинэ анги', options: options, required: true)],
    onSubmit: (v) async {
      final id = v.get<String>('class')!;
      await ref.read(studentsAdminRepositoryProvider).enroll(id, studentId);
      return id;
    },
  );
  if (target == null) return null;
  final room = rooms.firstWhere(
    (c) => c.id == target,
    orElse: () => ClassroomRef(id: target, name: 'шинэ'),
  );
  invalidateStudent(ref, studentId);
  if (context.mounted) _snack(context, '$name ${room.name} анги руу шилжлээ');
  return room.name;
}

/// Сэргээх: буцаах анги (сүүлийн анги урьдчилан сонгогдоно), эсвэл ангигүй.
Future<bool> restoreStudent(
  BuildContext context,
  WidgetRef ref, {
  required String studentId,
  required String name,
  String? lastClassId,
}) async {
  final rooms = await _classes(context, ref) ?? const <ClassroomRef>[];
  if (!context.mounted) return false;
  const none = '';
  final initial = lastClassId != null && rooms.any((c) => c.id == lastClassId) ? lastClassId : none;
  final done = await showFormSheet<String>(
    context,
    title: 'Сургалтад сэргээх',
    subtitle: name,
    submitLabel: 'Сэргээх',
    fields: [
      FormSelectField<String>(
        name: 'class',
        label: 'Буцаах анги',
        initial: initial,
        options: [const SelectOption(none, 'Ангид оноохгүй, дараа хуваарилна'), ...rooms.map(_classOption)],
      ),
    ],
    onSubmit: (v) async {
      final id = v.get<String>('class') ?? none;
      await ref.read(studentsAdminRepositoryProvider).unarchive(studentId, classroomId: id);
      return id;
    },
  );
  if (done == null) return false;
  final room = rooms.where((c) => c.id == done).firstOrNull;
  invalidateStudent(ref, studentId);
  if (context.mounted) _snack(context, room == null ? '$name сэргээгдлээ' : '$name ${room.name} ангид сэргээгдлээ');
  return true;
}

const archiveReasons = ['Сургалтаа орхисон', 'Өөр сургалтад шилжсэн', 'Төлбөр', 'Давхар бүртгэл'];

/// Тооцоогүй архивлах шалтгаан асууна (серверт илгээхгүй — «Буцаах» хугацааны дараа жагсаалт илгээнэ).
Future<String?> askArchiveReason(BuildContext context, {required String name}) => showFormSheet<String>(
  context,
  title: 'Тооцоогүй архивлах',
  subtitle: '$name. Ангиас гарч, нэвтрэх эрх хаагдана. Ирц, дүнгийн түүх хадгалагдана. Архиваас хэдийд ч сэргээнэ',
  submitLabel: 'Архивлах',
  fields: [
    FormSelectField<String>(
      name: 'preset',
      label: 'Шалтгаан сонгох',
      options: [for (final r in archiveReasons) SelectOption(r, r)],
    ),
    const FormTextField(name: 'reason', label: 'Эсвэл бичих', maxLines: 2, maxLength: 500),
  ],
  onSubmit: (v) async {
    final typed = v.text('reason');
    final reason = typed.isNotEmpty ? typed : (v.get<String>('preset') ?? '');
    if (reason.trim().length < 3) {
      throw const ApiError(ApiErrorKind.badRequest, 'Шалтгаанаа сонгох эсвэл бичнэ үү');
    }
    return reason.trim();
  },
);

/// Сургалтаас хасах — серверийн тооцоог харуулж, батлахад хадгална (сурагч архивлагдана).
Future<bool> withdrawStudent(
  BuildContext context,
  WidgetRef ref, {
  required String studentId,
  required String name,
}) async {
  final refund = await WithdrawalSheet.open(context, studentId: studentId, name: name);
  if (refund == null) return false;
  invalidateStudent(ref, studentId);
  if (context.mounted) {
    _snack(
      context,
      refund > 0 ? '$name сургалтаас хасагдлаа. Буцаах дүн буцаалтын жагсаалтад орлоо' : '$name сургалтаас хасагдлаа',
    );
  }
  return true;
}

/// Нэр, утас, сургууль, эцэг эхийн утас — одоо байгаа багшийн хуудасны маягт (давхардуулахгүй).
Future<bool> editBasicProfile(
  BuildContext context,
  WidgetRef ref, {
  required String studentId,
  required StudentsPerms perms,
}) async {
  try {
    final detail = await ref.read(studentDetailProvider(studentId).future);
    if (!context.mounted) return false;
    final msg = await ProfileEditSheet.open(context, detail: detail, showGuardians: perms.canSeeGuardians);
    if (msg == null) return false;
    invalidateStudent(ref, studentId);
    if (context.mounted) _snack(context, msg);
    return true;
  } catch (e) {
    if (context.mounted) _snack(context, _err(e, 'Сурагчийн мэдээлэл нээгдсэнгүй'));
    return false;
  }
}

UbDateTime? _day(String? iso) => parseDateKey(iso) ?? ubDay(iso);

/// Бүртгэлийн талбарууд (вэбийн «Мэдээлэл» таб): салбар, секц, элссэн/гарсан огноо, төлбөрийн багц.
/// Төлбөрийн хэсэг зөвхөн мөнгө харах эрхтэй хүнд. Өөрчилсөн талбарыг л илгээнэ.
Future<bool> editRegistration(
  BuildContext context,
  WidgetRef ref, {
  required String studentId,
  required StudentsPerms perms,
}) async {
  final AdminStudentDetail d;
  try {
    d = await ref.read(adminStudentDetailProvider(studentId).future);
  } catch (e) {
    if (context.mounted) _snack(context, _err(e, 'Сурагчийн мэдээлэл нээгдсэнгүй'));
    return false;
  }
  if (!context.mounted) return false;
  final money = perms.canEditTuition;
  final saved = await showFormSheet<bool>(
    context,
    title: 'Бүртгэл, төлбөрийн багц',
    subtitle: d.fullName,
    fields: [
      FormTextField(name: 'branch', label: 'Салбар', initial: d.branch, hint: 'Баруун 4'),
      FormTextField(name: 'section', label: 'Секц', initial: d.section, hint: '12-2'),
      FormDateField(name: 'joinedOn', label: 'Элссэн огноо', initial: _day(d.joinedOn)),
      FormDateField(name: 'leftOn', label: 'Гарсан огноо', initial: _day(d.leftOn)),
      if (money) ...[
        FormSelectField<TuitionPlan>(
          name: 'plan',
          label: 'Төлбөрийн багц',
          initial: d.tuitionPlan,
          options: [for (final p in TuitionPlan.values) SelectOption(p, p.label)],
        ),
        FormMoneyField(name: 'amount', label: 'Төлбөрийн дүн', initial: d.tuitionAmount, min: 0),
        FormTextField(name: 'note', label: 'Төлбөрийн тэмдэглэл', initial: d.tuitionNote, maxLines: 2),
      ],
    ],
    onSubmit: (v) async {
      final body = registrationPatch(
        d,
        branch: v.text('branch'),
        section: v.text('section'),
        joinedOn: v.date('joinedOn')?.dateKey,
        leftOn: v.date('leftOn')?.dateKey,
        money: money,
        plan: v.get<TuitionPlan>('plan'),
        amount: v.integer('amount'),
        note: v.text('note'),
      );
      if (body.isEmpty) return false;
      await ref.read(studentsAdminRepositoryProvider).updateProfile(studentId, body);
      return true;
    },
  );
  if (saved != true) return false;
  invalidateStudent(ref, studentId);
  if (context.mounted) _snack(context, 'Хадгалагдлаа');
  return true;
}

/// Бүртгэлийн маягтын өөрчлөгдсөн талбарууд (вэбийн `StudentInfoTab` diff-тэй ижил).
Map<String, Object?> registrationPatch(
  AdminStudentDetail d, {
  required String branch,
  required String section,
  String? joinedOn,
  String? leftOn,
  required bool money,
  TuitionPlan? plan,
  int? amount,
  String note = '',
}) {
  String key(String? iso) => _day(iso)?.dateKey ?? '';
  return {
    if (branch != (d.branch ?? '')) 'branch': branch,
    if (section != (d.section ?? '')) 'section': section,
    if (joinedOn != null && joinedOn != key(d.joinedOn)) 'joinedOn': joinedOn,
    if (leftOn != null && leftOn != key(d.leftOn)) 'leftOn': leftOn,
    if (money && plan != null && plan != d.tuitionPlan) 'tuitionPlan': plan.api,
    if (money && amount != null && amount != d.tuitionAmount) 'tuitionAmount': amount,
    if (money && note != (d.tuitionNote ?? '')) 'tuitionNote': note,
  };
}

/// Шинэ сурагч бүртгэх (`POST /users/students`, Багш+/Админ). Нэвтрэх нэр, нууц үг = сурагчийн утас.
Future<({String id, String name, String? code})?> registerStudent(BuildContext context, WidgetRef ref) async {
  final rooms = await _classes(context, ref) ?? const <ClassroomRef>[];
  if (!context.mounted) return null;
  final created = await showFormSheet<({String id, String name, String? code})>(
    context,
    title: 'Шинэ сурагч бүртгэх',
    subtitle: 'Нэвтрэх нэр, нууц үг хоёулаа сурагчийн утасны дугаар',
    submitLabel: 'Бүртгэх',
    fields: [
      const FormTextField(name: 'lastName', label: 'Овог', required: true, maxLength: 60),
      const FormTextField(name: 'firstName', label: 'Нэр', required: true, maxLength: 60),
      const FormPhoneField(name: 'phone', label: 'Утас', required: true),
      FormSelectField<String>(name: 'class', label: 'Анги', options: rooms.map(_classOption).toList()),
      FormDateField(name: 'joinedOn', label: 'Эхэлсэн огноо', initial: UbDateTime.now().startOfDay),
      const FormTextField(name: 'school', label: 'Сургууль', maxLength: 120),
      const FormNumberField(name: 'grade', label: 'Анги (жил)', min: 1, max: 12),
      const FormPhoneField(name: 'fatherPhone', label: 'Эцгийн утас'),
      const FormPhoneField(name: 'motherPhone', label: 'Эхийн утас'),
      FormSelectField<TuitionPlan>(
        name: 'plan',
        label: 'Төлбөрийн багц',
        options: [
          for (final p in TuitionPlan.values)
            if (p != TuitionPlan.unknown) SelectOption(p, p.label),
        ],
      ),
      const FormTextField(name: 'note', label: 'Тэмдэглэл', maxLines: 2, maxLength: 500),
    ],
    onSubmit: (v) {
      final classId = v.get<String>('class');
      // 13-р анги нь төгсөгчид, сургуулийн анги 12 хэвээр (вэбтэй ижил).
      final classGrade = rooms.where((c) => c.id == classId).firstOrNull?.grade;
      final grade = v.integer('grade') ?? classGrade?.clamp(1, 12);
      String? opt(String k) => v.text(k).isEmpty ? null : v.text(k);
      return ref.read(studentsAdminRepositoryProvider).createStudent({
        'lastName': v.text('lastName'),
        'firstName': v.text('firstName'),
        'phone': v.text('phone'),
        'classroomId': ?classId,
        'joinedOn': ?v.date('joinedOn')?.dateKey,
        'school': ?opt('school'),
        'grade': ?grade,
        'fatherPhone': ?opt('fatherPhone'),
        'motherPhone': ?opt('motherPhone'),
        'tuitionPlan': ?v.get<TuitionPlan>('plan')?.api,
        'note': ?opt('note'),
      });
    },
  );
  if (created == null) return null;
  ref.read(studentsListVersionProvider.notifier).bump();
  if (context.mounted) {
    _snack(
      context,
      created.code == null ? '${created.name} бүртгэгдлээ' : '${created.name} бүртгэгдлээ, код ${created.code}',
    );
  }
  return created;
}
