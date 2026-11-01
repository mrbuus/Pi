import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Мэдэгдлийн дэлгэцийн дүрсүүд (AppIcons-д нэгтгэх хүртэл энд).
abstract final class NotificationsIcons {
  static const IconData bell = LucideIcons.bell;
  static const IconData markAll = LucideIcons.checkCheck;
  static const IconData more = LucideIcons.chevronDown;
  static const IconData settings = LucideIcons.bellRing;
  static const IconData go = LucideIcons.arrowUpRight;
  static const IconData payment = LucideIcons.wallet;
  static const IconData homework = LucideIcons.notebookPen;
  static const IconData schedule = LucideIcons.calendarDays;
  static const IconData announcement = LucideIcons.messageSquare;
  static const IconData system = LucideIcons.info;

  static IconData forKind(String kind) => switch (kind) {
        'PAYMENT_DUE' => payment,
        'HOMEWORK' => homework,
        'SCHEDULE_CHANGE' => schedule,
        'ANNOUNCEMENT' => announcement,
        _ => system,
      };
}
