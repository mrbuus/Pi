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

  // Feature-ээс нэгтгэсэн нэмэлт дүрс
  /// Нэмэх
  static const IconData add = LucideIcons.plus;

  /// Зүүн сум
  static const IconData arrowLeft = LucideIcons.arrowLeft;

  /// Баруун сум
  static const IconData arrowRight = LucideIcons.arrowRight;

  /// Нээх сум
  static const IconData arrowUpRight = LucideIcons.arrowUpRight;

  /// Арилгах
  static const IconData backspace = LucideIcons.delete;

  /// Баталгаажсан
  static const IconData badgeCheck = LucideIcons.badgeCheck;

  /// Хаагдсан
  static const IconData ban = LucideIcons.ban;

  /// Мэдэгдлийн тохиргоо
  static const IconData bellRing = LucideIcons.bellRing;

  /// Дэвтэр, хийсэн
  static const IconData bookOpenCheck = LucideIcons.bookOpenCheck;

  /// Алдаа мэдээлэх
  static const IconData bug = LucideIcons.bug;

  /// Хуанли, шалгасан
  static const IconData calendarCheck = LucideIcons.calendarCheck;

  /// Хичээлгүй өдөр
  static const IconData calendarEmpty = LucideIcons.calendarX2;

  /// Хугацаа дууссан
  static const IconData calendarExpired = LucideIcons.calendarX;

  /// Амралтын өдөр
  static const IconData calendarOff = LucideIcons.calendarOff;

  /// Хуваарийн таб
  static const IconData calendarRange = LucideIcons.calendarRange;

  /// Камер унтарсан
  static const IconData cameraOff = LucideIcons.cameraOff;

  /// Бүгдийг уншсан
  static const IconData checkAll = LucideIcons.checkCheck;

  /// Жагсаалт
  static const IconData checklist = LucideIcons.listChecks;

  /// Хийгээгүй тойрог
  static const IconData circle = LucideIcons.circle;

  /// Тодорхойгүй тойрог
  static const IconData circleDashed = LucideIcons.circleDashed;

  /// Цэгтэй тойрог
  static const IconData circleDot = LucideIcons.circleDot;

  /// Хасах тойрог
  static const IconData circleMinus = LucideIcons.circleMinus;

  /// Хүчингүй
  static const IconData circleSlash = LucideIcons.circleSlash;

  /// Хадгалсан
  static const IconData cloudCheck = LucideIcons.cloudCheck;

  /// Интернэтгүй
  static const IconData cloudOff = LucideIcons.cloudOff;

  /// Ачаалж байна
  static const IconData cloudUpload = LucideIcons.cloudUpload;

  /// Танхим
  static const IconData doorOpen = LucideIcons.doorOpen;

  /// Цэвэрлэх
  static const IconData eraser = LucideIcons.eraser;

  /// Гадаад холбоос
  static const IconData externalLink = LucideIcons.externalLink;

  /// Файл илгээсэн
  static const IconData fileCheck = LucideIcons.fileCheck2;

  /// Асуулт байхгүй
  static const IconData fileQuestion = LucideIcons.fileQuestion;

  /// Тэмдэг
  static const IconData flag = LucideIcons.flag;

  /// Дараалал
  static const IconData flame = LucideIcons.flame;

  /// Гэрэл асаах
  static const IconData flashlight = LucideIcons.flashlight;

  /// Гэрэл унтраах
  static const IconData flashlightOff = LucideIcons.flashlightOff;

  /// Томьёо
  static const IconData formula = LucideIcons.sigma;

  /// Бэлэн байдал
  static const IconData gauge = LucideIcons.gauge;

  /// Асуултын тор
  static const IconData grid = LucideIcons.grid3x3;

  /// Түүх
  static const IconData historyLog = LucideIcons.history;

  /// Хугацаа
  static const IconData hourglass = LucideIcons.hourglass;

  /// Код
  static const IconData idCard = LucideIcons.idCard;

  /// Зураг нэмэх
  static const IconData imagePlus = LucideIcons.imagePlus;

  /// Зургууд
  static const IconData images = LucideIcons.images;

  /// Гараар оруулах
  static const IconData keyboard = LucideIcons.keyboard;

  /// Онлайн
  static const IconData laptop = LucideIcons.laptop;

  /// Номын сан
  static const IconData libraryBig = LucideIcons.libraryBig;

  /// Санал, зөвлөмж
  static const IconData lightbulb = LucideIcons.lightbulb;

  /// Холбоос
  static const IconData link = LucideIcons.link2;

  /// Даалгаврын жагсаалт
  static const IconData listTodo = LucideIcons.listTodo;

  /// Хадгалж байна
  static const IconData loaderCircle = LucideIcons.loaderCircle;

  /// Имэйл
  static const IconData mail = LucideIcons.mail;

  /// Имэйл илгээсэн
  static const IconData mailCheck = LucideIcons.mailCheck;

  /// Медаль
  static const IconData medal = LucideIcons.medal;

  /// Зар, мэдээлэл
  static const IconData megaphone = LucideIcons.megaphone;

  /// Тусламжийн чат
  static const IconData messageCircle = LucideIcons.messageCircle;

  /// Багшийн тэмдэглэл
  static const IconData messageSquareText = LucideIcons.messageSquareText;

  /// Хасах
  static const IconData minus = LucideIcons.minus;

  /// Дэлгэц унтарсан
  static const IconData monitorOff = LucideIcons.monitorOff;

  /// Тайлбар
  static const IconData note = LucideIcons.alignLeft;

  /// Жишээ
  static const IconData pencilLine = LucideIcons.pencilLine;

  /// Тэмдэглэл
  static const IconData penLine = LucideIcons.penLine;

  /// Бэхэлсэн
  static const IconData pin = LucideIcons.pin;

  /// Эхлүүлэх
  static const IconData play = LucideIcons.play;

  /// Баримт
  static const IconData receipt = LucideIcons.receipt;

  /// Давтах
  static const IconData repeat = LucideIcons.repeat;

  /// Дахин эхлүүлэх
  static const IconData restart = LucideIcons.rotateCcw;

  /// Эргүүлэх
  static const IconData rotate = LucideIcons.rotateCw;

  /// Хадгалах
  static const IconData save = LucideIcons.save;

  /// Илгээх
  static const IconData send = LucideIcons.send;

  /// Шалгуур
  static const IconData slidersHorizontal = LucideIcons.slidersHorizontal;

  /// Наалт тэмдэглэл
  static const IconData stickyNote = LucideIcons.stickyNote;

  /// Таймер
  static const IconData timer = LucideIcons.timer;

  /// Устгах
  static const IconData trash = LucideIcons.trash2;

  /// Бууралт
  static const IconData trendingDown = LucideIcons.trendingDown;

  /// Өсөлт
  static const IconData trendingUp = LucideIcons.trendingUp;

  /// Буцаах
  static const IconData undo = LucideIcons.undo2;

  /// Ирэх, хүлээгдэж буй
  static const IconData upcoming = LucideIcons.calendarClock;

  /// Видео бичлэг
  static const IconData videoRecord = LucideIcons.video;
}
