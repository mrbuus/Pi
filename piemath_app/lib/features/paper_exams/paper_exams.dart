/// «Нэгдсэн шалгалт» — бусад feature-д залгах нийтийн хэсэг.
///
/// - Сурагчийн «Шалгалт» хэсгийн «Нэгдсэн шалгалт» таб, эсвэл ажилтны сурагчийн хуудасны таб:
///   `StudentPaperExams(studentId: id)`.
/// - Ажилтны `/app/tests` AppBar: `actions: const [PaperExamsEntryButton()]`.
library;

export 'ui/paper_exams_list_screen.dart' show PaperExamsEntryButton;
export 'ui/student_paper_exams.dart' show StudentPaperExams;
