import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../application/classrooms_admin_providers.dart';
import '../data/classrooms_admin_models.dart';

/// Ангийн удирдлагын доороос гарах маягтууд (засах, багш оноох, архивлах, шинэ анги, сурагч нэмэх).
/// Бүгд `showFormSheet` эсвэл `showSelectSheet` дээр; амжилттай бол `true`, хаавал `null`.

const _noTeacher = '';

const sameTeacherMessage = 'Ангийн багш ба туслах багш өөр хүн байх ёстой';

String errorMessage(Object e, String fallback) =>
    e is ApiError && e.kind != ApiErrorKind.unknown && e.message.trim().isNotEmpty ? e.message : fallback;

void showSnack(BuildContext context, String message) {
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

List<SelectOption<String>> _teacherOptions(List<TeacherOption> options, AdminClassroom c) {
  final rows = [for (final o in options) SelectOption(o.id, o.name)];
  // Одоогийн багш жагсаалтад алга (хичээл заадаггүй болсон) бол ч харагдана (вэбийн TeacherPicker)
  for (final p in [c.assistantTeacher, c.teacher]) {
    if (p != null && !rows.any((r) => r.value == p.id)) rows.insert(0, SelectOption(p.id, p.name));
  }
  return [const SelectOption(_noTeacher, 'Багшгүй'), ...rows];
}

/// Сонголт ачаалж байх зуур товч бүдгэрэхгүйн тулд жагсаалтыг эхлээд татна. Алдаа бол snackbar, `null`.
Future<List<TeacherOption>?> _loadTeachers(BuildContext context, Future<List<TeacherOption>> Function() load) async {
  try {
    return await load();
  } catch (e) {
    if (context.mounted) showSnack(context, errorMessage(e, 'Багшийн жагсаалтыг ачаалж чадсангүй'));
    return null;
  }
}

/// Ангийн багш, туслах багш оноох (`PATCH /classrooms/:id/teachers`, Админ, Багш+).
Future<bool?> showTeacherSheet(BuildContext context, WidgetRef ref, AdminClassroom c) async {
  final repo = ref.read(classroomsAdminRepositoryProvider);
  final options = await _loadTeachers(context, repo.lessonTeachers);
  if (options == null || !context.mounted) return null;
  final list = _teacherOptions(options, c);
  return showFormSheet<bool>(
    context,
    title: 'Ангийн багш',
    subtitle: c.name,
    initialSize: FormSheet.midSize,
    fields: [
      FormSelectField<String>(
        name: 'teacher',
        label: 'Ангийн багш',
        options: list,
        initial: c.teacher?.id ?? _noTeacher,
        icon: AppIcons.user,
      ),
      FormSelectField<String>(
        name: 'assistant',
        label: 'Туслах ангийн багш',
        options: list,
        initial: c.assistantTeacher?.id ?? _noTeacher,
        icon: AppIcons.user,
      ),
    ],
    onSubmit: (v) async {
      final lead = v.get<String>('teacher') ?? _noTeacher;
      final assistant = v.get<String>('assistant') ?? _noTeacher;
      if (lead.isNotEmpty && lead == assistant) {
        throw const ApiError(ApiErrorKind.badRequest, sameTeacherMessage);
      }
      await repo.setTeachers(
        c.id,
        teacherId: lead.isEmpty ? null : lead,
        assistantTeacherId: assistant.isEmpty ? null : assistant,
      );
      return true;
    },
  );
}

const _noGrade = 0;

List<SelectOption<int>> _gradeOptions(int? current) => [
  const SelectOption(_noGrade, 'Анги сонгоогүй'),
  for (var g = 1; g <= 12; g++) SelectOption(g, '$g-р анги'),
  if (current != null && current > 12) SelectOption(current, '$current-р анги'),
];

List<SelectOption<ClassroomKind>> get _kindOptions => [for (final k in ClassroomKind.values) SelectOption(k, k.label)];

List<SelectOption<ClassSubject>> get _subjectOptions => [for (final s in ClassSubject.values) SelectOption(s, s.label)];

/// Ангийн мэдээлэл засах (Админ, `PATCH /classrooms/:id`): нэр, төрөл, анги, хичээл, хоёр багш.
/// Зөвхөн өөрчилсөн талбарыг илгээнэ — дэлгэрэнгүйд ирээгүй хичээлийг санамсаргүй дарж бичихгүй.
Future<bool?> showEditClassroomSheet(BuildContext context, WidgetRef ref, AdminClassroom c) async {
  final repo = ref.read(classroomsAdminRepositoryProvider);
  final options = await _loadTeachers(context, repo.staffTeachers);
  if (options == null || !context.mounted) return null;
  final teachers = _teacherOptions(options, c);
  return showFormSheet<bool>(
    context,
    title: 'Ангийн мэдээлэл засах',
    subtitle: c.name,
    fields: [
      FormTextField(name: 'name', label: 'Ангийн нэр', initial: c.name, required: true, maxLength: 60),
      FormSelectField<ClassroomKind>(name: 'kind', label: 'Төрөл', options: _kindOptions, initial: c.kind),
      FormSelectField<int>(name: 'grade', label: 'Анги', options: _gradeOptions(c.grade), initial: c.grade ?? _noGrade),
      FormSelectField<ClassSubject>(name: 'subject', label: 'Хичээл', options: _subjectOptions, initial: c.subject),
      FormSelectField<String>(
        name: 'teacher',
        label: 'Ангийн багш',
        options: teachers,
        initial: c.teacher?.id ?? _noTeacher,
        icon: AppIcons.user,
      ),
      FormSelectField<String>(
        name: 'assistant',
        label: 'Туслах ангийн багш',
        options: teachers,
        initial: c.assistantTeacher?.id ?? _noTeacher,
        icon: AppIcons.user,
      ),
    ],
    onSubmit: (v) async {
      final patch = editPatch(c, v);
      if (patch.teacherId != null || patch.assistantTeacherId != null) {
        final lead = patch.teacherId ?? c.teacher?.id ?? '';
        final assistant = patch.assistantTeacherId ?? c.assistantTeacher?.id ?? '';
        if (lead.isNotEmpty && lead == assistant) {
          throw const ApiError(ApiErrorKind.badRequest, sameTeacherMessage);
        }
      }
      if (patch.toJson().isNotEmpty) await repo.update(c.id, patch);
      return true;
    },
  );
}

/// Маягтын утгаас зөвхөн өөрчлөгдсөн талбартай засвар.
ClassroomPatch editPatch(AdminClassroom c, FormValues v) {
  final name = v.text('name');
  final kind = v.get<ClassroomKind>('kind');
  final grade = v.get<int>('grade') ?? _noGrade;
  final subject = v.get<ClassSubject>('subject');
  final lead = v.get<String>('teacher') ?? _noTeacher;
  final assistant = v.get<String>('assistant') ?? _noTeacher;
  final gradeChanged = grade != (c.grade ?? _noGrade);
  return ClassroomPatch(
    name: name.isNotEmpty && name != c.name ? name : null,
    kind: kind != null && kind != c.kind ? kind : null,
    grade: gradeChanged && grade != _noGrade ? grade : null,
    clearGrade: gradeChanged && grade == _noGrade,
    subject: subject != null && subject != c.subject ? subject : null,
    teacherId: lead != (c.teacher?.id ?? _noTeacher) ? lead : null,
    assistantTeacherId: assistant != (c.assistantTeacher?.id ?? _noTeacher) ? assistant : null,
  );
}

/// Архивлах (Админ). Өнөөдрийн UB огноог «ЖЖЖЖССӨӨ» хэлбэрээр бичиж баталгаажуулна (вэбтэй ижил).
Future<bool?> showArchiveSheet(BuildContext context, WidgetRef ref, AdminClassroom c) {
  final repo = ref.read(classroomsAdminRepositoryProvider);
  final code = todayCodeUB(ref.read(classroomsTodayProvider));
  return showFormSheet<bool>(
    context,
    title: '«${c.name}» ангийг архивлах уу',
    subtitle:
        'Ангийг идэвхтэй жагсаалтаас хасна. Сурагчдын бүртгэл, ирц, түүх хадгалагдана. '
        'Баталгаажуулахын тулд өнөөдрийн огноог ЖЖЖЖССӨӨ хэлбэрээр бичнэ үү',
    submitLabel: 'Архивлах',
    initialSize: FormSheet.midSize,
    fields: [
      FormTextField(
        name: 'code',
        label: 'Баталгаажуулах код',
        hint: 'ЖЖЖЖССӨӨ',
        required: true,
        validator: (t) => t == code ? null : 'Баталгаажуулах код таарахгүй байна',
      ),
    ],
    onSubmit: (v) async {
      await repo.archive(c.id, v.text('code'));
      return true;
    },
  );
}

/// Шинэ анги (Админ, Багш+). Багш нь хуваарьт оногддог багшаас.
Future<AdminClassroom?> showCreateClassroomSheet(BuildContext context, WidgetRef ref) async {
  final repo = ref.read(classroomsAdminRepositoryProvider);
  final options = await _loadTeachers(context, repo.lessonTeachers);
  if (options == null || !context.mounted) return null;
  return showFormSheet<AdminClassroom>(
    context,
    title: 'Шинэ анги',
    submitLabel: 'Үүсгэх',
    fields: [
      const FormTextField(name: 'name', label: 'Ангийн нэр', required: true, maxLength: 60),
      FormSelectField<ClassroomKind>(
        name: 'kind',
        label: 'Төрөл',
        options: _kindOptions,
        initial: ClassroomKind.inPerson,
        required: true,
      ),
      FormSelectField<int>(name: 'grade', label: 'Анги', options: _gradeOptions(null), initial: _noGrade),
      FormSelectField<ClassSubject>(
        name: 'subject',
        label: 'Хичээл',
        options: _subjectOptions,
        initial: ClassSubject.math,
      ),
      FormSelectField<String>(
        name: 'teacher',
        label: 'Ангийн багш',
        options: [const SelectOption(_noTeacher, 'Багшгүй'), for (final o in options) SelectOption(o.id, o.name)],
        initial: _noTeacher,
        icon: AppIcons.user,
      ),
    ],
    onSubmit: (v) {
      final grade = v.get<int>('grade') ?? _noGrade;
      return repo.create(
        name: v.text('name'),
        kind: v.get<ClassroomKind>('kind') ?? ClassroomKind.inPerson,
        grade: grade == _noGrade ? null : grade,
        subject: v.get<ClassSubject>('subject') ?? ClassSubject.math,
        teacherId: v.get<String>('teacher'),
      );
    },
  );
}

/// Шилжүүлэх ангийг сонгох (одоогийн ангиас бусад).
Future<AdminClassroom?> pickTargetClass(
  BuildContext context,
  List<AdminClassroom> rooms, {
  String? excludeId,
  String title = 'Шилжүүлэх анги',
}) async {
  final options = [
    for (final r in rooms)
      if (r.id != excludeId) SelectOption(r, r.name, subtitle: r.gradeLabel, icon: AppIcons.myClass),
  ];
  if (options.isEmpty) {
    showSnack(context, 'Шилжүүлэх өөр анги алга');
    return null;
  }
  final picked = await showSelectSheet<AdminClassroom>(context, title: title, options: options);
  return picked?.value;
}

/// Ангид нэмэх сурагч (ангигүй сурагчдаас сонгоно).
class PickedStudent {
  const PickedStudent({required this.id, required this.firstName, required this.lastName, this.studentCode});

  final String id;
  final String firstName;
  final String lastName;
  final String? studentCode;

  String get fullName => '$lastName $firstName'.trim();
}

/// Ангид сурагч нэмэх: ангигүй сурагчид (удаан хүлээсэн нь эхэнд), нэр, кодоор хайх (`/users/search`, зөвхөн
/// ангигүй сурагчдаас — вэбтэй ижил). Сонгоод «Ангид нэмэх».
Future<PickedStudent?> showAddStudentSheet(BuildContext context, {required String className}) =>
    showModalBottomSheet<PickedStudent>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      showDragHandle: true,
      builder: (_) => AddStudentSheet(className: className),
    );

class AddStudentSheet extends ConsumerStatefulWidget {
  const AddStudentSheet({super.key, required this.className});

  final String className;

  @override
  ConsumerState<AddStudentSheet> createState() => _AddStudentSheetState();
}

class _AddStudentSheetState extends ConsumerState<AddStudentSheet> {
  final _search = TextEditingController();
  Timer? _debounce;
  List<UnassignedStudent>? _unassigned;
  Object? _loadError;
  List<StudentHit>? _hits;
  Object? _searchError;
  bool _searching = false;
  int _seq = 0;
  PickedStudent? _selected;

  @override
  void initState() {
    super.initState();
    unawaited(_load());
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _loadError = null);
    try {
      final rows = await ref.read(classroomsAdminRepositoryProvider).unassigned();
      if (mounted) setState(() => _unassigned = rows);
    } catch (e) {
      if (mounted) setState(() => _loadError = e);
    }
  }

  void _onChanged(String text) {
    _debounce?.cancel();
    setState(() {
      _selected = null;
      if (text.trim().length < 2) {
        _hits = null;
        _searchError = null;
        _searching = false;
      }
    });
    if (text.trim().length < 2) return;
    _debounce = Timer(const Duration(milliseconds: 300), () => _runSearch(text.trim()));
  }

  Future<void> _runSearch(String q) async {
    final id = ++_seq;
    setState(() {
      _searching = true;
      _searchError = null;
    });
    try {
      final rows = await ref.read(classroomsAdminRepositoryProvider).searchStudents(q);
      if (!mounted || id != _seq) return;
      setState(() {
        _hits = rows;
        _searching = false;
      });
    } catch (e) {
      if (!mounted || id != _seq) return;
      setState(() {
        _searchError = e;
        _searching = false;
      });
    }
  }

  List<PickedStudent> get _candidates {
    final waiting = _unassigned ?? const <UnassignedStudent>[];
    final hits = _hits;
    if (hits == null) {
      return [
        for (final u in waiting)
          PickedStudent(id: u.id, firstName: u.firstName, lastName: u.lastName, studentCode: u.studentCode),
      ];
    }
    final ids = {for (final u in waiting) u.id};
    return [
      for (final h in hits)
        if (ids.contains(h.id))
          PickedStudent(id: h.id, firstName: h.firstName, lastName: h.lastName, studentCode: h.studentCode),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final candidates = _candidates;
    final searched = _hits != null;
    Widget body;
    if (_loadError != null) {
      body = ErrorState(message: errorMessage(_loadError!, 'Ангигүй сурагчдыг ачаалж чадсангүй'), onRetry: _load);
    } else if (_unassigned == null || _searching) {
      body = const Center(child: CircularProgressIndicator());
    } else if (_searchError != null) {
      body = ErrorState(
        message: errorMessage(_searchError!, 'Хайлт амжилтгүй боллоо'),
        onRetry: () => _runSearch(_search.text.trim()),
      );
    } else if (candidates.isEmpty) {
      body = EmptyState(
        icon: AppIcons.students,
        title: searched ? 'Ийм нэртэй, ангигүй сурагч олдсонгүй' : 'Ангигүй сурагч алга',
      );
    } else {
      body = ListView.builder(
        itemCount: candidates.length,
        itemBuilder: (context, i) {
          final s = candidates[i];
          final selected = _selected?.id == s.id;
          return ListTile(
            key: ValueKey('add-${s.id}'),
            minTileHeight: AppSizes.minTap,
            selected: selected,
            title: Text(s.fullName),
            subtitle: Text(s.studentCode ?? 'Кодгүй'),
            trailing: selected ? Icon(AppIcons.check, color: c.brand) : null,
            onTap: () => setState(() => _selected = s),
          );
        },
      );
    }
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: SizedBox(
        height: MediaQuery.sizeOf(context).height * 0.8,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
              child: Text('Ангид сурагч нэмэх', style: context.text.titleMedium),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
              child: TextField(
                controller: _search,
                onChanged: _onChanged,
                decoration: const InputDecoration(
                  prefixIcon: Icon(AppIcons.search),
                  hintText: 'Нэр эсвэл сурагчийн кодоор хайх',
                  isDense: true,
                ),
              ),
            ),
            Expanded(child: body),
            SafeArea(
              top: false,
              child: Padding(
                padding: const EdgeInsets.all(AppSpace.gutter),
                child: FilledButton(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(AppSizes.minTap)),
                  onPressed: _selected == null ? null : () => Navigator.of(context).pop(_selected),
                  child: Text(
                    _selected == null ? 'Сурагч сонгоно уу' : '${_selected!.fullName} ангид нэмэх',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
