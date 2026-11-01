import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// Апп-д хэрэглэх Lucide дүрснүүд — **зөвхөн эндээс** (emoji, unicode глиф ХОРИОТОЙ).
///
/// Яагаад wrapper: дараа нь (M10) багцын хэмжээ багасгахын тулд Lucide-ийн зөвхөн
/// хэрэглэсэн глифээс бүтсэн өөрийн фонт руу шилжвэл ганц энэ файл л солигдоно.
abstract final class AppIcons {
  // Навигаци
  static const IconData home = LucideIcons.house;
  static const IconData myClass = LucideIcons.school;
  static const IconData tests = LucideIcons.clipboardList;
  static const IconData schedule = LucideIcons.calendarDays;
  static const IconData notifications = LucideIcons.bell;
  static const IconData profile = LucideIcons.circleUser;
  static const IconData more = LucideIcons.layoutGrid;
  static const IconData theory = LucideIcons.bookOpen;
  static const IconData homework = LucideIcons.notebookPen;
  static const IconData children = LucideIcons.users;
  static const IconData classes = LucideIcons.graduationCap;
  static const IconData payments = LucideIcons.wallet;
  static const IconData scan = LucideIcons.scanLine;
  static const IconData qr = LucideIcons.qrCode;
  static const IconData library = LucideIcons.layers;
  static const IconData video = LucideIcons.circlePlay;
  static const IconData exam = LucideIcons.clipboardCheck;
  static const IconData calendar = LucideIcons.calendar;
  static const IconData theoryPhoto = LucideIcons.camera;
  static const IconData card = LucideIcons.creditCard;
  static const IconData store = LucideIcons.store;
  static const IconData tools = LucideIcons.shapes;
  static const IconData goal = LucideIcons.target;
  static const IconData enroll = LucideIcons.userPlus;
  static const IconData bank = LucideIcons.building;
  static const IconData chart = LucideIcons.chartColumn;
  static const IconData message = LucideIcons.messageSquare;
  static const IconData draft = LucideIcons.pencil;
  static const IconData students = LucideIcons.users;
  static const IconData shield = LucideIcons.shieldCheck;
  static const IconData history = LucideIcons.clock;
  static const IconData practice = LucideIcons.dumbbell;
  static const IconData ranking = LucideIcons.trophy;

  // Үйлдэл
  static const IconData back = LucideIcons.chevronLeft;
  static const IconData forward = LucideIcons.chevronRight;
  static const IconData expand = LucideIcons.chevronDown;
  static const IconData retry = LucideIcons.refreshCw;
  static const IconData search = LucideIcons.search;
  static const IconData camera = LucideIcons.camera;
  static const IconData gallery = LucideIcons.image;
  static const IconData document = LucideIcons.fileText;
  static const IconData copy = LucideIcons.copy;
  static const IconData check = LucideIcons.check;
  static const IconData close = LucideIcons.x;
  static const IconData menu = LucideIcons.menu;
  static const IconData overflow = LucideIcons.ellipsis;
  static const IconData logout = LucideIcons.logOut;
  static const IconData settings = LucideIcons.settings;

  // Төлөв
  static const IconData info = LucideIcons.info;
  static const IconData help = LucideIcons.circleHelp;
  static const IconData error = LucideIcons.circleAlert;
  static const IconData warning = LucideIcons.triangleAlert;
  static const IconData success = LucideIcons.circleCheck;
  static const IconData failure = LucideIcons.circleX;
  static const IconData offline = LucideIcons.wifiOff;
  static const IconData empty = LucideIcons.inbox;
  static const IconData time = LucideIcons.clock;
  static const IconData secure = LucideIcons.shieldCheck;

  // Маягт
  static const IconData phone = LucideIcons.phone;
  static const IconData password = LucideIcons.lock;
  static const IconData key = LucideIcons.keyRound;
  static const IconData show = LucideIcons.eye;
  static const IconData hide = LucideIcons.eyeOff;
  static const IconData user = LucideIcons.userRound;

  // Горим
  static const IconData light = LucideIcons.sun;
  static const IconData dark = LucideIcons.moon;
  static const IconData system = LucideIcons.smartphone;
}
