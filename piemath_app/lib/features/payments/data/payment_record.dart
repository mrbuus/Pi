import 'package:freezed_annotation/freezed_annotation.dart';

part 'payment_record.freezed.dart';
part 'payment_record.g.dart';

/// `GET /payments/my`-ийн мөр (апп хэрэглэх талбарууд л; дотоод талбаруудыг хадгалахгүй, кэшлэхгүй).
/// Гэрээ: `docs/api-contract/notifications-payments-misc.md`.
@freezed
abstract class PaymentRecord with _$PaymentRecord {
  const factory PaymentRecord({
    required String id,
    required num amount,
    String? method,
    required String status,
    String? description,

    /// «2026-09» — аль сарын төлбөр.
    String? forMonth,
    String? paidAt,
    required String createdAt,
  }) = _PaymentRecord;

  factory PaymentRecord.fromJson(Map<String, Object?> json) => _$PaymentRecordFromJson(json);
}

/// Сурагчийн одоогийн анги (`GET /assignments/my-classrooms`) — төлбөрийн түвшин сонгоход.
@freezed
abstract class MyClassroom with _$MyClassroom {
  const factory MyClassroom({required String id, @Default('') String name, required String type, int? grade}) =
      _MyClassroom;

  factory MyClassroom.fromJson(Map<String, Object?> json) => _$MyClassroomFromJson(json);
}
