import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Төлбөрийн төлөвийн дүрсүүд (AppIcons-д нэгтгэх хүртэл энд — үндсэн session нэгтгэнэ).
abstract final class PaymentIcons {
  static const IconData pending = LucideIcons.clock;
  static const IconData confirmed = LucideIcons.check;
  static const IconData rejected = LucideIcons.x;
  static const IconData reversed = LucideIcons.undo2;
  static const IconData unknown = LucideIcons.circleHelp;
  static const IconData paidUnknown = LucideIcons.calendarClock;
  static const IconData paidExpired = LucideIcons.calendarX;
  static const IconData paidOk = LucideIcons.calendarCheck;
  static const IconData receipt = LucideIcons.receipt;
  static const IconData copy = LucideIcons.copy;
}
