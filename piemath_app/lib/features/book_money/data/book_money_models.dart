import 'package:flutter/foundation.dart';

import '../../../core/format/person_name.dart';
import '../../learning/data/json.dart';

export '../../learning/data/json.dart' show Json;

/// «Номын мөнгө» — `api/src/book-payments` (эзэн 2026-11-12), вэбийн `components/book-money/books.ts`.

/// Сургалтын төвөөс зардаг номууд — API-ийн `BOOKS`-той ижил дараалал, түлхүүр.
const kBooks = <({String key, String title})>[
  (key: 'E1', title: 'E-1'),
  (key: 'E2', title: 'E-2'),
  (key: 'E3', title: 'E-3'),
  (key: 'HAVTGAI1', title: 'Хавтгай-1'),
  (key: 'HAVTGAI2', title: 'Хавтгай-2'),
  (key: 'OGTORGUI', title: 'Огторгуй'),
  (key: 'PITEST', title: 'Pi test'),
];

/// Шалгалтын хариултын хуудасны чек нээх төрөл — дугаарыг (1, 2 …) сервер өгнө.
/// Нэгдсэн шалгалт: бүх ангид ижил зүйл. Ангийн шалгалт: анги бүрт тусдаа.
const kSheetKinds = <({String key, String title})>[
  (key: 'SHEET', title: 'Нэгдсэн шалгалт'),
  (key: 'CSHEET', title: 'Ангийн шалгалт'),
];

/// API-ийн `BOOK_AMOUNT_MAX` (нэг номын дүн).
const kBookAmountMax = 1000000;

/// API-ийн `CHECK_AMOUNT_MAX` (чекийн үнэ).
const kCheckAmountMax = 100000000;

/// API-ийн `BOOK_NOTE_MAX`.
const kBookNoteMax = 200;

/// Төлбөрийн бүртгэлийн хүн (багш, тэмдэглэсэн хүн).
@immutable
class BookPerson {
  const BookPerson({required this.id, required this.firstName, required this.lastName, this.role});

  factory BookPerson.fromJson(Object? json) {
    final j = asMap(json);
    return BookPerson(
      id: asStr(j['id']) ?? '',
      firstName: asStr(j['firstName']) ?? '',
      lastName: asStr(j['lastName']) ?? '',
      role: asStr(j['role']),
    );
  }

  static BookPerson? maybe(Object? json) => json is Map ? BookPerson.fromJson(json) : null;

  final String id;
  final String firstName;
  final String lastName;
  final String? role;

  /// «Б. Нэр», Багш+ бол «+».
  String get display => staffName(firstName: firstName, lastName: lastName, role: role);
}

enum BookStatus {
  paid('PAID'),
  skipped('SKIPPED');

  const BookStatus(this.api);
  final String api;

  static BookStatus? parse(Object? v) => switch (v) {
    'PAID' => paid,
    'SKIPPED' => skipped,
    _ => null,
  };
}

/// Нэг сурагч, нэг номын бүртгэл (идэвхтэй эсвэл түүхийн мөр). Мөр хэзээ ч устахгүй — өөрчлөхөд
/// хуучин нь `voidedAt` авна.
@immutable
class BookPayment {
  const BookPayment({
    required this.id,
    required this.studentId,
    required this.bookKey,
    required this.status,
    this.amount,
    this.note,
    this.classroomId,
    this.classroomName,
    this.collectedBy,
    this.createdBy,
    this.createdAt,
    this.voidedAt,
    this.voidedBy,
    this.title,
  });

  factory BookPayment.fromJson(Object? json) {
    final j = asMap(json);
    final cls = asMap(j['classroom']);
    return BookPayment(
      id: asStr(j['id']) ?? '',
      studentId: asStr(j['studentId']) ?? '',
      bookKey: asStr(j['bookKey']) ?? '',
      status: BookStatus.parse(j['status']) ?? BookStatus.paid,
      amount: asInt(j['amount']),
      note: asStr(j['note']),
      classroomId: j['classroom'] is Map ? asStr(cls['id']) : null,
      classroomName: j['classroom'] is Map ? asStr(cls['name']) : null,
      collectedBy: BookPerson.maybe(j['collectedBy']),
      createdBy: BookPerson.maybe(j['createdBy']),
      createdAt: DateTime.tryParse(asStr(j['createdAt']) ?? ''),
      voidedAt: DateTime.tryParse(asStr(j['voidedAt']) ?? ''),
      voidedBy: BookPerson.maybe(j['voidedBy']),
      title: asStr(j['title']),
    );
  }

  final String id;
  final String studentId;
  final String bookKey;
  final BookStatus status;
  final int? amount;
  final String? note;

  /// Мөнгөө өгөх үед сууж байсан анги; `null` = ангигүй.
  final String? classroomId;
  final String? classroomName;
  final BookPerson? collectedBy;
  final BookPerson? createdBy;
  final DateTime? createdAt;
  final DateTime? voidedAt;
  final BookPerson? voidedBy;

  /// Зөвхөн түүхийн мөрөнд (сервер зүйлийн нэрийг нэмж өгдөг).
  final String? title;

  bool get paid => status == BookStatus.paid;
  bool get skipped => status == BookStatus.skipped;
  bool get voided => voidedAt != null;
}

/// Сурагчийн нэг зүйл (ном эсвэл шалгалтын хуудас) — одоогийн төлөвтэй.
@immutable
class StudentBookRow {
  const StudentBookRow({required this.key, required this.title, this.suggestedAmount, this.payment});

  factory StudentBookRow.fromJson(Object? json) {
    final j = asMap(json);
    return StudentBookRow(
      key: asStr(j['key']) ?? '',
      title: asStr(j['title']) ?? '',
      suggestedAmount: asInt(j['suggestedAmount']),
      payment: j['payment'] is Map ? BookPayment.fromJson(j['payment']) : null,
    );
  }

  final String key;
  final String title;

  /// Сурагчийн ангийн чекийн үнэ, эсвэл хамгийн сүүлийн чекийн үнэ.
  final int? suggestedAmount;
  final BookPayment? payment;
}

/// Сурагчийн сууж байсан анги (одоогийнх эхэнд).
@immutable
class BookClassroom {
  const BookClassroom({required this.id, required this.name, required this.current});

  factory BookClassroom.fromJson(Object? json) {
    final j = asMap(json);
    return BookClassroom(id: asStr(j['id']) ?? '', name: asStr(j['name']) ?? '', current: asBool(j['current']));
  }

  final String id;
  final String name;
  final bool current;
}

/// `GET /book-payments/students/:id`.
@immutable
class StudentBooks {
  const StudentBooks({
    required this.studentId,
    required this.firstName,
    required this.lastName,
    required this.classrooms,
    required this.books,
    required this.history,
  });

  factory StudentBooks.fromJson(Object? json) {
    final j = asMap(json);
    final s = asMap(j['student']);
    return StudentBooks(
      studentId: asStr(s['id']) ?? '',
      firstName: asStr(s['firstName']) ?? '',
      lastName: asStr(s['lastName']) ?? '',
      classrooms: [for (final c in asList(j['classrooms'])) BookClassroom.fromJson(c)],
      books: [for (final b in asList(j['books'])) StudentBookRow.fromJson(b)],
      history: [for (final h in asList(j['history'])) BookPayment.fromJson(h)],
    );
  }

  final String studentId;
  final String firstName;
  final String lastName;
  final List<BookClassroom> classrooms;
  final List<StudentBookRow> books;
  final List<BookPayment> history;

  /// «Овог Нэр» (вэбтэй ижил).
  String get name => '$lastName $firstName'.trim();

  /// Шинэ тэмдэглэгээний анхдагч анги — одоогийн анги.
  String? get currentClassroomId {
    for (final c in classrooms) {
      if (c.current) return c.id;
    }
    return null;
  }
}

/// «Номын мөнгө» самбарын нэг анги, нэг ном.
@immutable
class BookClassRow {
  const BookClassRow({
    required this.classroomId,
    required this.name,
    required this.classArchived,
    this.checkId,
    this.hidden = false,
    this.price,
    this.total = 0,
    this.paidHere = 0,
    this.paidElsewhere = 0,
    this.skipped = 0,
    this.left = 0,
    this.formerPaid = 0,
    this.collected,
  });

  factory BookClassRow.fromJson(Object? json) {
    final j = asMap(json);
    return BookClassRow(
      classroomId: asStr(j['classroomId']) ?? '',
      name: asStr(j['name']) ?? '',
      classArchived: j['classArchived'] != false,
      checkId: asStr(j['checkId']),
      hidden: asBool(j['hidden']),
      price: asInt(j['price']),
      total: asInt(j['total']) ?? 0,
      paidHere: asInt(j['paidHere']) ?? 0,
      paidElsewhere: asInt(j['paidElsewhere']) ?? 0,
      skipped: asInt(j['skipped']) ?? 0,
      left: asInt(j['left']) ?? 0,
      formerPaid: asInt(j['formerPaid']) ?? 0,
      collected: asInt(j['collected']),
    );
  }

  final String classroomId;
  final String name;
  final bool classArchived;
  final String? checkId;

  /// Чекийг нуусан.
  final bool hidden;
  final int? price;
  final int total;
  final int paidHere;
  final int paidElsewhere;
  final int skipped;
  final int left;
  final int formerPaid;

  /// Энэ ангид цугларсан мөнгө (`null` бол харуулахгүй).
  final int? collected;
}

/// Самбарын нэг ном/хуудас.
@immutable
class BookSection {
  const BookSection({
    required this.key,
    required this.title,
    required this.classes,
    this.noClassPaid = 0,
    this.paid = 0,
    this.collected,
  });

  factory BookSection.fromJson(Object? json) {
    final j = asMap(json);
    return BookSection(
      key: asStr(j['key']) ?? '',
      title: asStr(j['title']) ?? '',
      classes: [for (final c in asList(j['classes'])) BookClassRow.fromJson(c)],
      noClassPaid: asInt(j['noClassPaid']) ?? 0,
      paid: asInt(j['paid']) ?? 0,
      collected: asInt(j['collected']),
    );
  }

  final String key;
  final String title;
  final List<BookClassRow> classes;
  final int noClassPaid;
  final int paid;
  final int? collected;
}

/// Багш тус бүрийн хураасан мөнгө.
@immutable
class CollectorTotal {
  const CollectorTotal({this.person, required this.count, required this.sum, required this.byBook});

  factory CollectorTotal.fromJson(Object? json) {
    final j = asMap(json);
    return CollectorTotal(
      person: BookPerson.maybe(j['person']),
      count: asInt(j['count']) ?? 0,
      sum: asInt(j['sum']) ?? 0,
      byBook: [
        for (final b in asList(j['byBook']))
          (
            bookKey: asStr(asMap(b)['bookKey']) ?? '',
            title: asStr(asMap(b)['title']) ?? '',
            count: asInt(asMap(b)['count']) ?? 0,
            sum: asInt(asMap(b)['sum']) ?? 0,
          ),
      ],
    );
  }

  final BookPerson? person;
  final int count;
  final int sum;
  final List<({String bookKey, String title, int count, int sum})> byBook;
}

/// `GET /book-payments/dashboard`.
@immutable
class BookDashboard {
  const BookDashboard({required this.books, required this.collectors});

  factory BookDashboard.fromJson(Object? json) {
    final j = asMap(json);
    return BookDashboard(
      books: [for (final b in asList(j['books'])) BookSection.fromJson(b)],
      collectors: [for (final c in asList(j['collectors'])) CollectorTotal.fromJson(c)],
    );
  }

  final List<BookSection> books;
  final List<CollectorTotal> collectors;
}

/// `GET /book-payments/collectors` — «Мөнгийг авсан багш» сонгогч.
@immutable
class BookCollectors {
  const BookCollectors({required this.me, required this.staff});

  factory BookCollectors.fromJson(Object? json) {
    final j = asMap(json);
    return BookCollectors(
      me: asStr(j['me']) ?? '',
      staff: [for (final s in asList(j['staff'])) BookPerson.fromJson(s)],
    );
  }

  /// Нэвтэрсэн хүн — анхдагч сонголт.
  final String me;

  /// Эзний өгсөн дарааллаар (сервер эрэмбэлнэ).
  final List<BookPerson> staff;
}

/// Тэмдэглэх/засах утга. Сурагчийн хуудаснаас `PUT /book-payments/students/:id/books/:key`,
/// ангийн номын чекээс [toCheckMarkBody]-оор `PUT /classrooms/:id/checks/:checkId/students/:sid`.
@immutable
class BookMarkInput {
  const BookMarkInput.paid({
    required int this.amount,
    this.collectedById,
    this.classroomId,
    this.setClassroom = false,
    this.note,
  }) : status = 'PAID';

  const BookMarkInput.skipped({this.classroomId, this.setClassroom = false, this.note})
    : status = 'SKIPPED',
      amount = null,
      collectedById = null;

  const BookMarkInput.none()
    : status = 'NONE',
      amount = null,
      collectedById = null,
      classroomId = null,
      setClassroom = false,
      note = null;

  /// `PAID` | `SKIPPED` | `NONE` (тэмдэглэгээг болиулах).
  final String status;
  final int? amount;

  /// Өгөхгүй бол сервер тэмдэглэж буй хүнийг авсан гэж бичнэ.
  final String? collectedById;

  /// [setClassroom] үед л илгээнэ (`null` = ангигүй).
  final String? classroomId;
  final bool setClassroom;
  final String? note;

  Json toJson() => {
    'status': status,
    if (amount != null) 'amount': amount,
    if (collectedById != null) 'collectedById': collectedById,
    if (setClassroom) 'classroomId': classroomId,
    // Тайлбаргүй = серверт ч хоосон (`cleanBookNote(undefined)` = null)
    if (status != 'NONE') 'note': ?note,
  };

  /// Ангийн номын чекийн тэмдэглэгээний бие (вэбийн `ClassChecksPanel.saveMore`).
  Json toCheckMarkBody() => switch (status) {
    'PAID' => {'checked': true, 'amount': ?amount, 'collectedById': ?collectedById, 'note': note},
    'SKIPPED' => {'checked': false, 'skipped': true, 'note': note},
    _ => {'checked': false},
  };
}
