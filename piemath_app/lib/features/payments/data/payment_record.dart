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
