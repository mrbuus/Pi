import 'package:flutter/foundation.dart';

import '../data/enrollment_models.dart';

/// Хичээлийн картын ноорог (вэбийн `DraftState`). Хадгалах хүртэл нүүр хуудсанд нөлөөлөхгүй.
@immutable
class WindowDraft {
  const WindowDraft({required this.status, required this.availability, this.note = ''});

  factory WindowDraft.of(EnrollmentWindow w) =>
      WindowDraft(status: w.status, availability: w.availability, note: w.note ?? '');

  final EnrollmentStatus status;
  final SubjectAvailability availability;
  final String note;

  WindowDraft copyWith({EnrollmentStatus? status, SubjectAvailability? availability, String? note}) => WindowDraft(
    status: status ?? this.status,
    availability: availability ?? this.availability,
    note: note ?? this.note,
  );

  /// Хадгалсан утгаас зөрсөн эсэх.
  bool isDirtyAgainst(EnrollmentWindow saved) =>
      saved.status != status || saved.availability != availability || (saved.note ?? '') != note;

  /// Өөрчлөгдсөн талбарууд л (вэбийн `commit` body-той ижил).
  ({EnrollmentStatus? status, SubjectAvailability? availability, String? note}) diff(EnrollmentWindow saved) => (
    status: status != saved.status ? status : null,
    availability: availability != saved.availability ? availability : null,
    note: note != (saved.note ?? '') ? note : null,
  );

  /// «Дууссан» руу ШИНЭЭР шилжих үед л баталгаажуулна — ирж буй хүсэлтийг зогсоох цорын ганц үйлдэл.
  bool needsCloseConfirm(EnrollmentWindow saved) =>
      status == EnrollmentStatus.closed && saved.status != EnrollmentStatus.closed;

  @override
  bool operator ==(Object other) =>
      other is WindowDraft && other.status == status && other.availability == availability && other.note == note;

  @override
  int get hashCode => Object.hash(status, availability, note);
}

/// Нүүр хуудсанд зочин юу харах (вэбийн `VisitorPreview`): ноорог дээр үндэслэнэ.
String visitorLine(EnrollmentStatus status, SubjectAvailability availability) => switch (status) {
  EnrollmentStatus.closed => 'Одоогоор шинэ элсэлт авахгүй байна',
  EnrollmentStatus.comingSoon => 'Тун удахгүй элсэлт эхэлнэ',
  EnrollmentStatus.open => 'Хамрах хэлбэр: ${availability.label}',
};

/// Сервер дахин ачаалахад хадгалаагүй ноорогтой картыг дарж бичихгүй — зөвхөн цэвэр картыг шинэ утгатай
/// синк хийнэ (вэбийн `load`-той ижил).
Map<EnrollmentSubject, WindowDraft> mergeDrafts(
  Map<EnrollmentSubject, WindowDraft> previous,
  List<EnrollmentWindow> previousSaved,
  List<EnrollmentWindow> fresh,
) {
  final next = {...previous};
  for (final w in fresh) {
    final draft = previous[w.subject];
    final old = previousSaved.where((s) => s.subject == w.subject).firstOrNull;
    if (draft == null || old == null || !draft.isDirtyAgainst(old)) next[w.subject] = WindowDraft.of(w);
  }
  return next;
}

/// Хичээлийг вэбийн `SUBJECT_ORDER`-оор (серверийн эрэмбээс үл хамааран).
List<EnrollmentWindow> orderedWindows(List<EnrollmentWindow> rows) => [
  for (final s in EnrollmentSubject.values) ...rows.where((w) => w.subject == s),
];

/// Хэдэн өдөр хүлээж байгаа (UB хуанлийн өдрөөр биш, вэбтэй ижил 24 цагаар).
int waitingDays(DateTime since, DateTime now) {
  final d = now.difference(since).inHours ~/ 24;
  return d < 0 ? 0 : d;
}
