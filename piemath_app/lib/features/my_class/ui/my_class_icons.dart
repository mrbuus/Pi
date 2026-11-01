import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Сурагчийн өдөр тутмын хэсгийн (нүүр, хичээл, хуваарь) нэмэлт Lucide дүрс.
/// Нийтлэг `AppIcons`-д байхгүйг л энд. Нэгтгэхдээ `AppIcons` руу шилжүүлж болно.
abstract final class MyClassIcons {
  static const IconData announcement = LucideIcons.megaphone;
  static const IconData pinned = LucideIcons.pin;
  static const IconData teacherNote = LucideIcons.messageSquareText;
  static const IconData attendance = LucideIcons.calendarCheck;
  static const IconData scheduleTab = LucideIcons.calendarRange;
  static const IconData todo = LucideIcons.circle;
  static const IconData done = LucideIcons.circleCheck;
  static const IconData resubmit = LucideIcons.rotateCcw;
  static const IconData notes = LucideIcons.penLine;
  static const IconData makeup = LucideIcons.listChecks;
  static const IconData noProblem = LucideIcons.fileQuestion;
  static const IconData noDay = LucideIcons.calendarX2;
  static const IconData photos = LucideIcons.images;
  static const IconData makeupPending = LucideIcons.circleDashed;
  static const IconData makeupPartial = LucideIcons.circleDot;
  static const IconData makeupWaived = LucideIcons.circleSlash;
  static const IconData paidOk = LucideIcons.calendarCheck;
  static const IconData paidSoon = LucideIcons.calendarClock;
  static const IconData paidExpired = LucideIcons.calendarX;
}
