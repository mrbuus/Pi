/// «Номын мөнгө» — бусад feature-д залгах нийтийн хэсэг.
///
/// - Сурагчийн хуудасны таб: `StudentScreen`-ий үндсэн таб (залгасан).
/// - Ангийн самбарын «Шинэ чек»-ийн ном/хуудас: вэбийн `CheckForm`-той адил нэг урсгал
///   (`teacher/ui/class_checks_screen.dart`), номын жагсаалт, үнийн дээд хязгаар, жишээ үнэ эндээс.
/// - Номын чекийн хүүхдийн «⋯»: `showBookMarkSheet(context, target: ..., onSave: (i) => mark(i.toCheckMarkBody()))`.
library;

export 'data/book_money_models.dart' show BookMarkInput, BookPerson, BookStatus, kBooks, kCheckAmountMax, kSheetKinds;
export 'domain/book_money_logic.dart' show priceHint;
export 'ui/book_mark_sheet.dart' show BookSheetTarget, showBookMarkSheet;
export 'ui/student_books_tab.dart' show StudentBooksTab;
