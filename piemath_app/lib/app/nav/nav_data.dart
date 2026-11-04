import 'package:flutter/widgets.dart';

import '../../core/auth/current_user.dart';
import '../../core/auth/user_role.dart';
import '../../core/ui/icons.dart';

/// Цэсний нэг холбоос. [path] нь вэбийн замтай ИЖИЛ (`/app/...`) — deep link, PARITY.md-тэй тулгахад.
@immutable
class NavLink {
  const NavLink(this.path, this.label, this.icon, {this.short, this.soon = false});

  final String path;
  final String label;
  final IconData icon;

  /// Доод мөрний богино шошго (375dp-д багтах).
  final String? short;

  /// Вэбд ч «Тун удахгүй» гэж тэмдэглэгдсэн.
  final bool soon;

  String get tabLabel => short ?? label;
}

enum NavGroup {
  learn('Сургалт'),
  classes('Анги'),
  finance('Төлбөр'),
  admin('Удирдлага'),
  internal('Дотоод'),
  personal('Хувийн'),
  soon('Тун удахгүй');

  const NavGroup(this.label);
  final String label;
}

/// Доод табын нэг хэсэг (вэбийн `BottomTabs` + `ClassHubTabs`/`ENROLL_HUB`-ийн нэгдэл).
///
/// [tab] нь доод мөрөнд харагдах товч (дүрс, богино шошго). [pages] нь хэсгийн дээд дэд табууд —
/// эхнийх нь хэсгийн үндсэн хуудас; ганц бол дэд табгүй (хуудас өөрөө).
@immutable
class NavSection {
  const NavSection(this.id, this.tab, {this._title, this._pages = const []});

  /// Тогтвортой түлхүүр (хуудасны key, тест).
  final String id;

  /// Доод табын товч.
  final NavLink tab;

  final String? _title;
  final List<NavLink> _pages;

  /// Хэсгийн гарчиг (дэд табтай үед AppBar-т).
  String get title => _title ?? tab.label;

  /// Дэд табууд (ганц бол дэд табгүй хэсэг).
  List<NavLink> get pages => _pages.isEmpty ? [tab] : _pages;

  bool get hasSubTabs => pages.length > 1;

  /// Хэсгийн эхний (анх нээгдэх) зам.
  String get rootPath => pages.first.path;
}

/// Вэбийн `components/nav/nav-data.ts`-ийн апп хувилбар (2026-11-01). Вэбд цэс өөрчлөгдвөл энд ч.
abstract final class NavData {
  static const _tools = NavLink('/app/tools', 'Хэрэглэгдэхүүн', AppIcons.tools);
  static const profile = NavLink('/app/profile', 'Миний мэдээлэл', AppIcons.user);

  static const _home = <UserRole, NavLink>{
    UserRole.groupTeacher: NavLink('/app/groups', 'Анги удирдах', AppIcons.students, short: 'Нүүр'),
    UserRole.student: NavLink('/app/student', 'Миний самбар', AppIcons.home, short: 'Нүүр'),
    UserRole.teacher: NavLink('/app/teacher', 'Багшийн самбар', AppIcons.home, short: 'Нүүр'),
    UserRole.teacherPlus: NavLink('/app/teacher', 'Багшийн самбар', AppIcons.home, short: 'Нүүр'),
    UserRole.admin: NavLink('/app/teacher', 'Удирдлага', AppIcons.home, short: 'Нүүр'),
    UserRole.buyer: NavLink('/app/buyer', 'Миний эрхүүд', AppIcons.home, short: 'Нүүр'),
    UserRole.parent: NavLink('/app/parent', 'Хүүхдийн явц', AppIcons.home, short: 'Нүүр'),
    UserRole.unknown: NavLink('/app/profile', 'Миний мэдээлэл', AppIcons.home, short: 'Нүүр'),
  };

  static const _library = NavLink('/app/library', 'Бодлогын сан', AppIcons.library, short: 'Сан');
  static const _videos = NavLink('/app/videos', 'Онлайн хичээл', AppIcons.video, short: 'Видео');
  static const _tests = NavLink('/app/tests', 'Шалгалт', AppIcons.exam, short: 'Шалгалт');
  static const _schedule = NavLink('/app/schedule', 'Хуваарь', AppIcons.calendar, short: 'Хуваарь');
  static const _classes = NavLink('/app/classes', 'Ангиуд', AppIcons.myClass);
  static const _students = NavLink('/app/admin/students', 'Сурагчид', AppIcons.students, short: 'Сурагчид');
  static const _adminTheory = NavLink('/app/admin/theory', 'Онолын агуулга', AppIcons.document);
  static const _payments = NavLink('/app/payments', 'Төлбөр', AppIcons.card, short: 'Төлбөр');
  static const _leads = NavLink('/app/admin/leads', 'Элсэлт', AppIcons.enroll, short: 'Элсэлт');
  static const _sorils = NavLink('/app/admin/sorils', 'Жишиг сорил', AppIcons.tests);
  static const _reconcile = NavLink('/app/admin/reconcile', 'Банкны тулгалт', AppIcons.bank);
  static const _analytics = NavLink('/app/admin/analytics', 'Аналитик', AppIcons.chart);
  static const _sms = NavLink('/app/sms', 'Дугаарлуу мессеж', AppIcons.message);
  static const _storeAdmin = NavLink('/app/admin/store', 'Дэлгүүрийн удирдлага', AppIcons.store);
  static const _internal = NavLink('/app/internal', 'Бодлогын ноорог', AppIcons.draft);
  static const _import = NavLink('/app/import', 'Word импорт', AppIcons.document);
  static const _store = NavLink('/app/store', 'Дэлгүүр', AppIcons.store);

  // Дэд табын холбоосууд (богино шошго нь дээд мөрөнд). Вэбийн `ClassHubTabs`-ийн
  // Хуваарь/Төлөвлөгч, `ENROLL_HUB`-ийн Хүсэлт/Элсэлт/Түвшин.
  static const _planner = NavLink('/app/planner', 'Төлөвлөгч', AppIcons.checklist, short: 'Төлөвлөгч');
  static const _classesTab = NavLink('/app/classes', 'Ангиуд', AppIcons.myClass, short: 'Ангиуд');
  static const _teacherHours = NavLink('/app/teacher-hours', 'Цагийн бүртгэл', AppIcons.time, short: 'Цаг');
  static const _leadsTab = NavLink('/app/admin/leads', 'Хүсэлтүүд', AppIcons.enroll, short: 'Хүсэлт');
  static const _enrollment = NavLink('/app/admin/enrollment', 'Элсэлтийн удирдлага', AppIcons.enroll, short: 'Элсэлт');
  static const _placement = NavLink('/app/admin/placement', 'Түвшин тогтоох', AppIcons.goal, short: 'Түвшин');
  static const _sorilsTab = NavLink('/app/admin/sorils', 'Жишиг сорил', AppIcons.tests, short: 'Сорил');
  static const _financeTab = NavLink('/app/admin/finance', 'Санхүү', AppIcons.payments, short: 'Санхүү');
  static const _classroomsAdmin = NavLink('/app/admin/classrooms', 'Ангиуд удирдах', AppIcons.myClass);
  static const _lessonFlowTab = NavLink('/app/lesson-flow', 'Хичээлийн урсгал', AppIcons.classes, short: 'Урсгал');
  static const _dismissalTab = NavLink('/app/dismissal', 'Анги тарах цаг', AppIcons.time, short: 'Тарах цаг');
  static const _dismissal = NavLink('/app/dismissal', 'Анги тарах цаг', AppIcons.time);
  static const _smsTab = NavLink('/app/sms', 'Дугаарлуу мессеж', AppIcons.message, short: 'Мессеж');
  static const _libraryTab = NavLink('/app/library', 'Бодлогын сан', AppIcons.library, short: 'Сан');
  static const _videosTab = NavLink('/app/videos', 'Онлайн хичээл', AppIcons.video, short: 'Видео');
  static const _theoryTab = NavLink('/app/admin/theory', 'Онолын агуулга', AppIcons.document, short: 'Онол');
  static const _toolsTab = NavLink('/app/tools', 'Хэрэглэгдэхүүн', AppIcons.tools, short: 'Хэрэгсэл');
  static const _testsTab = NavLink('/app/tests', 'Шалгалт', AppIcons.exam, short: 'Шалгалт');
  static const _reconcileTab = NavLink('/app/admin/reconcile', 'Банкны тулгалт', AppIcons.bank, short: 'Тулгалт');
  static const _storeAdminTab = NavLink('/app/admin/store', 'Дэлгүүрийн удирдлага', AppIcons.store, short: 'Дэлгүүр');
  static const _scheduleTab = NavLink('/app/schedule', 'Хуваарь', AppIcons.calendar, short: 'Хуваарь');
  static const _studentsTab = NavLink('/app/admin/students', 'Сурагчид', AppIcons.students, short: 'Сурагчид');
  static const _tuitionTab = NavLink('/app/tuition', 'Сургалтын төлбөр', AppIcons.receipt, short: 'Сургалт');
  static const _onlineTab = NavLink('/app/online', 'Онлайн сурагчид', AppIcons.laptop, short: 'Онлайн');

  // Удирдлагын (админ) нэмэлт хуудсууд — NATIVE-PLAN §2.
  static const _insights = NavLink('/app/insights', 'Дүн шинжилгээ', AppIcons.trendingUp);
  static const _content = NavLink('/app/admin/content', 'Контент', AppIcons.libraryBig);
  static const _registry = NavLink('/app/admin/registry', 'Бүртгэл', AppIcons.idCard);
  static const _deletionRequests = NavLink('/app/admin/deletion-requests', 'Устгах хүсэлт', AppIcons.trash);
  static const _loginText = NavLink('/app/admin/login-text', 'Нэвтрэх бичиг', AppIcons.penLine);

  /// Ажилтны «Хуваарь» хэсэг (вэбийн `CLASS_HUB` + «Анги» бүлэг).
  static const _staffSchedule = [_scheduleTab, _planner, _classesTab];

  /// Role бүрийн доод таб ба дээд дэд табууд (эзэн 2026-11-04: «Бусад»-д нуугдсаныг хэсэгт нь).
  /// Энд ороогүй цэс «Бусад»-д үлдэнэ ([moreGroups]) — нэг ч цэс хасагдахгүй.
  static const _sections = <UserRole, List<NavSection>>{
    UserRole.student: [
      NavSection('home', NavLink('/app/student', 'Миний самбар', AppIcons.home, short: 'Нүүр')),
      NavSection(
        'homework',
        NavLink('/app/homework', 'Гэрийн даалгавар', AppIcons.homework, short: 'Даалгавар'),
        title: 'Даалгавар',
        pages: [
          NavLink('/app/homework', 'Гэрийн даалгавар', AppIcons.homework, short: 'Даалгавар'),
          _testsTab,
        ],
      ),
      NavSection('class', NavLink('/app/my-class', 'Хичээл', AppIcons.calendar, short: 'Хичээл')),
      // Бие даан суралцах төв сурагчид доод цэснээс шууд харагдана (эзэн 2026-11-04)
      NavSection(
        'theory',
        NavLink('/app/study', 'Бие даан суралцах', AppIcons.library, short: 'Суралцах'),
        title: 'Суралцах',
        pages: [
          NavLink('/app/study', 'Бие даан суралцах', AppIcons.library, short: 'Бие даалт'),
          NavLink('/app/theory', 'Онолын зураг', AppIcons.theoryPhoto, short: 'Онол'),
          NavLink('/app/library', 'Ном', AppIcons.theory, short: 'Ном'),
        ],
      ),
    ],
    UserRole.teacher: [
      NavSection('home', NavLink('/app/teacher', 'Багшийн самбар', AppIcons.home, short: 'Нүүр')),
      NavSection('schedule', _schedule, pages: [..._staffSchedule, _lessonFlowTab, _studentsTab, _dismissalTab]),
      NavSection('library', _library, title: 'Сургалтын сан', pages: [_libraryTab, _videosTab, _theoryTab, _toolsTab]),
      NavSection('tests', _tests),
    ],
    UserRole.teacherPlus: [
      NavSection('home', NavLink('/app/teacher', 'Багшийн самбар', AppIcons.home, short: 'Нүүр')),
      NavSection('schedule', _schedule, pages: [..._staffSchedule, _lessonFlowTab, _teacherHours]),
      // Санхүү зөвхөн Админд (вэбийн RequireRole ADMIN) — эрх өөрчлөхгүй.
      NavSection('payments', _payments, pages: [_payments, _tuitionTab, _reconcileTab, _storeAdminTab]),
      NavSection(
        'students',
        _students,
        pages: [_studentsTab, _leadsTab, _enrollment, _placement, _sorilsTab, _smsTab, _onlineTab],
      ),
    ],
    // Админ багшийн самбараас эхэлнэ (эзэн 2026-11-04); удирдлагын хуудсууд нүүрний «Удирдлага» товчоор
    UserRole.admin: [
      NavSection('home', NavLink('/app/teacher', 'Багшийн самбар', AppIcons.home, short: 'Нүүр')),
      NavSection('schedule', _schedule, pages: [..._staffSchedule, _lessonFlowTab, _teacherHours]),
      NavSection('payments', _payments, pages: [_payments, _tuitionTab, _financeTab, _reconcileTab, _storeAdminTab]),
      NavSection(
        'students',
        _students,
        pages: [_studentsTab, _leadsTab, _enrollment, _placement, _sorilsTab, _smsTab, _onlineTab],
      ),
    ],
    UserRole.buyer: [
      NavSection('home', NavLink('/app/buyer', 'Миний эрхүүд', AppIcons.home, short: 'Нүүр')),
      NavSection(
        'library',
        _library,
        title: 'Сургалтын сан',
        pages: [
          _libraryTab,
          _testsTab,
          NavLink('/app/study', 'Суралцах', AppIcons.theory, short: 'Суралцах'),
          NavLink('/app/study/history', 'Давтлагын түүх', AppIcons.history, short: 'Давтлага'),
          _toolsTab,
        ],
      ),
      NavSection('videos', _videos),
      NavSection('schedule', _schedule),
    ],
    UserRole.groupTeacher: [
      NavSection('home', NavLink('/app/groups', 'Анги удирдах', AppIcons.students, short: 'Нүүр')),
      NavSection('library', _library, title: 'Сургалтын сан', pages: [_libraryTab, _toolsTab]),
      NavSection('videos', _videos),
    ],
    UserRole.parent: [
      NavSection('home', NavLink('/app/parent', 'Хүүхдийн явц', AppIcons.home, short: 'Нүүр')),
      NavSection('schedule', _schedule),
    ],
    UserRole.unknown: [NavSection('home', NavLink('/app/profile', 'Миний мэдээлэл', AppIcons.home, short: 'Нүүр'))],
  };

  /// Role бүрийн бүрэн цэс (эхнийх нь нүүр).
  static const _byRole = <UserRole, List<NavLink>>{
    UserRole.groupTeacher: [_library, _videos, _store, _tools],
    UserRole.student: [
      NavLink('/app/homework', 'Гэрийн даалгавар', AppIcons.homework, short: 'Даалгавар'),
      NavLink('/app/my-class', 'Хичээл', AppIcons.calendar, short: 'Хичээл'),
      NavLink('/app/theory', 'Онолын зураг', AppIcons.theoryPhoto, short: 'Онол'),
      _tests,
      NavLink('/app/library', 'Ном', AppIcons.theory),
      NavLink('/app/student/payments', 'Төлбөр', AppIcons.card),
      NavLink('/app/study/history', 'Давтлага', AppIcons.history),
      NavLink('/app/practice', 'Дасгал', AppIcons.practice),
      NavLink('/app/learn', 'Хичээл үзэх', AppIcons.theory),
      NavLink('/app/videos', 'Онлайн хичээл', AppIcons.video),
      NavLink('/app/goals', 'Миний зорилго', AppIcons.goal),
    ],
    UserRole.teacher: [_library, _videos, _tests, _schedule, _classes, _students, _adminTheory, _tools, _dismissal],
    UserRole.teacherPlus: [
      _classroomsAdmin,
      _dismissal,
      _internal,
      _import,
      _library,
      _videos,
      _tests,
      _payments,
      _leads,
      _sorils,
      _reconcile,
      _schedule,
      _adminTheory,
      _students,
      _analytics,
      _sms,
      _classes,
      _storeAdmin,
      _tools,
    ],
    UserRole.admin: [
      _classroomsAdmin,
      _dismissal,
      NavLink('/app/admin/v2', 'v2 ажлын хяналт', AppIcons.tests),
      NavLink('/app/admin/capabilities', 'Эрхийн матриц', AppIcons.shield),
      _internal,
      _import,
      NavLink('/app/teacher', 'Багшийн самбар', AppIcons.classes),
      NavLink('/app/teacher-hours', 'Цагийн бүртгэл', AppIcons.time),
      _library,
      _videos,
      _tests,
      _leads,
      _sorils,
      _reconcile,
      _schedule,
      _adminTheory,
      _students,
      NavLink('/app/admin/audit', 'Аудит', AppIcons.shield),
      _analytics,
      _sms,
      _classes,
      NavLink('/app/admin/finance', 'Санхүү', AppIcons.payments),
      NavLink('/app/admin/passes', 'Эрхийн удирдлага', AppIcons.key),
      _storeAdmin,
      _insights,
      _content,
      _registry,
      _deletionRequests,
      _loginText,
    ],
    UserRole.buyer: [
      NavLink('/app/results-ranking', 'Миний дүн, байр', AppIcons.ranking),
      NavLink('/app/study', 'Суралцах', AppIcons.theory),
      NavLink('/app/study/history', 'Давтлагын түүх', AppIcons.history),
      _library,
      _videos,
      _tests,
      _schedule,
      _store,
      _tools,
    ],
    UserRole.parent: [_schedule],
    UserRole.unknown: [],
  };

  static const _group = <String, NavGroup>{
    '/app/internal': NavGroup.internal,
    '/app/study/history': NavGroup.learn,
    '/app/groups': NavGroup.classes,
    '/app/study': NavGroup.learn,
    '/app/results-ranking': NavGroup.learn,
    '/app/admin/v2': NavGroup.admin,
    '/app/admin/capabilities': NavGroup.admin,
    '/app/import': NavGroup.internal,
    '/app/my-class': NavGroup.classes,
    '/app/theory': NavGroup.learn,
    '/app/classes': NavGroup.classes,
    '/app/admin/classrooms': NavGroup.classes,
    '/app/dismissal': NavGroup.classes,
    '/app/admin/finance': NavGroup.finance,
    '/app/admin/passes': NavGroup.admin,
    '/app/admin/store': NavGroup.finance,
    '/app/practice': NavGroup.learn,
    '/app/store': NavGroup.personal,
    '/app/tools': NavGroup.learn,
    '/app/learn': NavGroup.learn,
    '/app/library': NavGroup.learn,
    '/app/videos': NavGroup.learn,
    '/app/tests': NavGroup.learn,
    '/app/teacher': NavGroup.classes,
    '/app/schedule': NavGroup.classes,
    '/app/admin/leads': NavGroup.admin,
    '/app/admin/sorils': NavGroup.admin,
    '/app/admin/reconcile': NavGroup.finance,
    '/app/admin/theory': NavGroup.internal,
    '/app/admin/students': NavGroup.classes,
    '/app/admin/audit': NavGroup.admin,
    '/app/admin/analytics': NavGroup.admin,
    '/app/insights': NavGroup.admin,
    '/app/admin/content': NavGroup.internal,
    '/app/admin/registry': NavGroup.admin,
    '/app/admin/deletion-requests': NavGroup.admin,
    '/app/admin/login-text': NavGroup.admin,
    '/app/tuition': NavGroup.finance,
    '/app/online': NavGroup.classes,
    '/app/teacher-hours': NavGroup.classes,
    '/app/payments': NavGroup.finance,
    '/app/sms': NavGroup.admin,
    '/app/goals': NavGroup.personal,
    '/app/student/payments': NavGroup.personal,
    '/app/homework': NavGroup.learn,
  };

  static const _staffGroupOrder = [
    NavGroup.classes,
    NavGroup.learn,
    NavGroup.finance,
    NavGroup.admin,
    NavGroup.internal,
    NavGroup.personal,
    NavGroup.soon,
  ];
  static const _groupOrder = [
    NavGroup.learn,
    NavGroup.classes,
    NavGroup.finance,
    NavGroup.admin,
    NavGroup.internal,
    NavGroup.personal,
    NavGroup.soon,
  ];

  /// Бүх role-д нийтлэг хувийн холбоос.
  static const commonPersonal = [
    NavLink('/app/support', 'Тусламж', AppIcons.message),
    NavLink('/app/feedback', 'Санал хүсэлт', AppIcons.document),
    NavLink('/app/notifications', 'Мэдэгдэл', AppIcons.notifications),
    NavLink('/app/consent', 'Нууцлал, зөвшөөрөл', AppIcons.shield),
  ];

  /// Цэс харуулах role: гадны багшийн профайлтай Багш/Багш+ → GROUP_TEACHER (вэбийн `navigationRole`).
  /// Зөвхөн харагдах байдал — эрхийн шийдвэр сервер дээр.
  static UserRole navigationRole(UserRole role, CurrentUser? user) {
    if ((role == UserRole.teacher || role == UserRole.teacherPlus) && user?.externalTeacherProfile != null) {
      return UserRole.groupTeacher;
    }
    return role;
  }

  static NavLink home(UserRole role) => _home[role] ?? _home[UserRole.unknown]!;

  /// Доод табын хэсгүүд (эхнийх нь нүүр; «Бусад»-ыг shell нэмнэ).
  static List<NavSection> sections(UserRole role) => _sections[role] ?? _sections[UserRole.unknown]!;

  /// Доод таб: хэсэг бүрийн товч (вэбийн `getBottomTabs`).
  static List<NavLink> tabs(UserRole role) => [for (final s in sections(role)) s.tab];

  /// Хэсгүүдэд (доод таб, дээд дэд таб) орсон бүх зам.
  static Set<String> sectionPaths(UserRole role) => {
    for (final s in sections(role)) ...[s.tab.path, for (final p in s.pages) p.path],
  };

  /// [path]-ыг аль хэсэг эзэмших вэ: хамгийн урт таарсан угтвар (яг таарсан эсвэл түүний доорх зам).
  /// «Бусад»-ын холбоос (жишээ нь `/app/student/payments`) эсвэл хэсэгт хамаарахгүй бол -1.
  static int sectionIndexOf(UserRole role, String path) {
    bool hit(String p) => path == p || path.startsWith('$p/');
    final list = sections(role);
    var best = -1;
    var bestLen = -1;
    for (var i = 0; i < list.length; i++) {
      for (final p in {list[i].tab.path, for (final l in list[i].pages) l.path}) {
        if (hit(p) && p.length > bestLen) {
          best = i;
          bestLen = p.length;
        }
      }
    }
    for (final (_, links) in moreGroups(role)) {
      for (final l in links) {
        if (hit(l.path) && l.path.length > bestLen) return -1;
      }
    }
    return best;
  }

  /// Админы «Удирдлага» төв (`/app/admin`) — багшийн самбарын дээд товчоор нээгдэнэ.
  static const manageGroups = <(String, List<NavLink>)>[
    (
      'Хяналт',
      [
        NavLink('/app/admin/analytics', 'Аналитик', AppIcons.chart),
        NavLink('/app/admin/audit', 'Аудит', AppIcons.shield),
        NavLink('/app/admin/v2', 'v2 ажлын хяналт', AppIcons.tests),
        _insights,
      ],
    ),
    (
      'Эрх',
      [
        NavLink('/app/admin/passes', 'Эрхийн удирдлага', AppIcons.key),
        NavLink('/app/admin/capabilities', 'Эрхийн матриц', AppIcons.shield),
        _deletionRequests,
      ],
    ),
    ('Санхүү', [_financeTab, _tuitionTab, _reconcile, _storeAdmin]),
    ('Элсэлт', [_leads, _enrollment, _placement, _sorils, _registry, _sms, _onlineTab]),
    ('Агуулга', [_content, _adminTheory, _internal, _import, _loginText]),
    ('Анги', [_classroomsAdmin, _dismissal]),
    ('Багш', [_teacherHours]),
  ];

  /// «Бусад» дэлгэцийн бүлгүүд — хэсэгт ороогүй БҮХ холбоос (нэг ч цэс хасагдахгүй) + хувийн.
  static List<(NavGroup, List<NavLink>)> moreGroups(UserRole role) {
    final placed = sectionPaths(role);
    final items = (_byRole[role] ?? const <NavLink>[]).where((i) => !placed.contains(i.path));
    final buckets = {for (final g in NavGroup.values) g: <NavLink>[]};
    for (final i in items) {
      buckets[i.soon ? NavGroup.soon : (_group[i.path] ?? NavGroup.learn)]!.add(i);
    }
    // «Сурагчид» Анги бүлэгт хамгийн сүүлд (эзэн 2026-10-27).
    final cls = buckets[NavGroup.classes]!;
    final idx = cls.indexWhere((i) => i.path == '/app/admin/students');
    if (idx >= 0) cls.add(cls.removeAt(idx));
    final personal = [
      profile,
      if (role == UserRole.student) ...[_store, _tools],
      ...commonPersonal,
    ];
    buckets[NavGroup.personal]!.insertAll(
      0,
      personal.where((p) => !placed.contains(p.path) && !buckets[NavGroup.personal]!.any((b) => b.path == p.path)),
    );
    final order = role.isStaff ? _staffGroupOrder : _groupOrder;
    return [
      for (final g in order)
        if (buckets[g]!.isNotEmpty) (g, buckets[g]!),
    ];
  }

  /// Одоогийн замд аль таб идэвхтэй (нүүр зөвхөн яг таарвал, бусад нь угтвараар).
  static int activeTab(List<NavLink> tabs, String location) {
    for (var i = 0; i < tabs.length; i++) {
      final p = tabs[i].path;
      if (i == 0 ? location == p : (location == p || location.startsWith('$p/'))) return i;
    }
    return -1;
  }
}
