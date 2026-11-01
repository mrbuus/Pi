import 'package:flutter/widgets.dart';

import '../../core/ui/tokens.dart';
import 'payment_icons.dart';

/// Төлбөрийн бүртгэлийн төлөв (`Payment.status`). Тооцоо СЕРВЕРТ — энд зөвхөн харуулах шошго.
enum PaymentStatus {
  pending('PENDING', 'Хүлээгдэж буй', PaymentIcons.pending),
  confirmed('CONFIRMED', 'Баталгаажсан', PaymentIcons.confirmed),
  rejected('REJECTED', 'Цуцалсан', PaymentIcons.rejected),
  reversed('REVERSED', 'Буцаасан', PaymentIcons.reversed),
  unknown('UNKNOWN', 'Тэмдэглэсэн', PaymentIcons.unknown);

  const PaymentStatus(this.api, this.label, this.icon);

  final String api;

  /// Вэбийн `paymentHelpers.ts` `STATUS_LABEL`-тэй ижил.
  final String label;
  final IconData icon;

  static PaymentStatus fromApi(String? v) =>
      values.firstWhere((s) => s.api == v, orElse: () => PaymentStatus.unknown);

  /// Дүрсний өнгө — үргэлж дүрс + шошготой хамт (өнгө дангаараа утга илэрхийлэхгүй).
  Color tone(AppColors c) => switch (this) {
        pending => c.info,
        confirmed => c.success,
        rejected => c.error,
        reversed || unknown => c.inkDim,
      };
}

/// Төлбөрийн арга (`Payment.method`), вэбийн `METHOD_LABEL`.
String? paymentMethodLabel(String? method) => switch (method) {
      'QPAY' => 'QPay',
      'BANK_TRANSFER' => 'Данс',
      'CASH' => 'Бэлэн',
      _ => null,
    };
