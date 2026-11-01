import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Гэрийн даалгаврын Lucide дүрс (feature-ийн дотоод; `lib/shared/marks/`-тэй дараа нэгтгэнэ).
abstract final class HomeworkIcons {
  static const IconData markDone = LucideIcons.bookOpenCheck;
  static const IconData markPartial = LucideIcons.circleDashed;
  static const IconData markMissing = LucideIcons.circleX;
  static const IconData unchecked = LucideIcons.circleDashed;
  static const IconData upcoming = LucideIcons.calendarClock;
  static const IconData comment = LucideIcons.messageSquareText;
  static const IconData deadline = LucideIcons.clock;
  static const IconData late = LucideIcons.hourglass;
  static const IconData start = LucideIcons.play;
  static const IconData resume = LucideIcons.rotateCcw;
  static const IconData submitted = LucideIcons.circleCheck;
  static const IconData test = LucideIcons.bookOpenCheck;
  static const IconData photoSent = LucideIcons.fileCheck2;
  static const IconData approved = LucideIcons.badgeCheck;
  static const IconData returned = LucideIcons.undo2;
  static const IconData wrong = LucideIcons.circleX;
  static const IconData blank = LucideIcons.circleDashed;
}
