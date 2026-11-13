/// «Номын мөнгө» — бусад feature-д залгах нийтийн хэсэг.
///
/// - Сурагчийн хуудасны таб: `StudentExtraTab('Ном', StudentBooksTab(studentId: id))`.
/// - Ангийн самбарын «Шинэ чек»-ийн ном/хуудас: `showNewBookCheckSheet(context, classroomId: id, usedBookKeys: keys)`.
/// - Номын чекийн хүүхдийн «⋯»: `showBookMarkSheet(context, target: ..., onSave: (i) => mark(i.toCheckMarkBody()))`.
library;

export 'data/book_money_models.dart' show BookMarkInput, BookPerson, BookStatus, kBooks, kSheetKinds;
export 'ui/book_mark_sheet.dart' show BookSheetTarget, showBookMarkSheet;
export 'ui/new_book_check_sheet.dart' show showNewBookCheckSheet;
export 'ui/student_books_tab.dart' show StudentBooksTab;
