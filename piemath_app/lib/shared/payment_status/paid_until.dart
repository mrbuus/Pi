import 'package:flutter/widgets.dart';

import '../../core/time/date_mn.dart';
import '../../core/time/ub_time.dart';
import '../../core/ui/tokens.dart';
import 'payment_icons.dart';

/// «Хэдий хүртэл төлсөн» төлөвийн ангилал (вэбийн `PaidUntilCard`).
enum PaidUntilKind { unknown, expired, soon, ok }

/// Серверийн тооцоолсон `paidUntil`-ийг харуулах мэдээлэл болгоно. Цэвэр — тесттэй.
///
/// Огноо: ISO-ийн эхний 10 тэмдэгтийг хуанлийн өдөр гэж уншина (вэб `getUTCDate` — бүсээр
/// гулсуулахгүй), өнөөдрийг Улаанбаатарын цагаар.
@immutable
class PaidUntilView {
  const PaidUntilView._(this.kind, this.date, this.daysLeft);

  factory PaidUntilView.of(String? paidUntilIso, {required UbDateTime today}) {
    final date = parseDateKey(paidUntilIso);
    if (date == null) return const PaidUntilView._(PaidUntilKind.unknown, null, null);
    final left = date.dayIndex - today.dayIndex;
    final kind = left < 0
        ? PaidUntilKind.expired
        : left < 7
            ? PaidUntilKind.soon
            : PaidUntilKind.ok;
    return PaidUntilView._(kind, date, left);
  }

  final PaidUntilKind kind;
  final UbDateTime? date;
  final int? daysLeft;

  /// «2026.11.30», тооцоогүй бол null.
  String? get dateLabel => date == null ? null : DateMn.numeric(date!);

  String get title => switch (kind) {
        PaidUntilKind.unknown => 'Төлбөрийн хугацаа тооцогдоогүй байна',
        PaidUntilKind.expired => '${daysLeft!.abs()} хоногийн өмнө дууссан',
        PaidUntilKind.soon => daysLeft == 0 ? 'Өнөөдөр дуусна' : '$daysLeft хоногийн дараа дуусна',
        PaidUntilKind.ok => '$daysLeft хоног үлдсэн',
      };

  String get hint => switch (kind) {
        PaidUntilKind.unknown => 'Анги, төлбөрийн мэдээлэл бүртгэгдмэгц энд харагдана.',
        PaidUntilKind.expired => 'Хичээлээ тасалдуулахгүйн тулд төлбөрөө төлөөрэй.',
        PaidUntilKind.soon => 'Удахгүй дуусах гэж байна. Дараагийн сарын төлбөрөө бэлдээрэй.',
        PaidUntilKind.ok => 'Бүх зүйл хэвийн. Хичээлдээ анхаараарай.',
      };

  IconData get icon => switch (kind) {
        PaidUntilKind.unknown || PaidUntilKind.soon => PaymentIcons.paidUnknown,
        PaidUntilKind.expired => PaymentIcons.paidExpired,
        PaidUntilKind.ok => PaymentIcons.paidOk,
      };

  Color tone(AppColors c) => switch (kind) {
        PaidUntilKind.unknown => c.inkDim,
        PaidUntilKind.expired => c.error,
        PaidUntilKind.soon => c.info,
        PaidUntilKind.ok => c.success,
      };
}
