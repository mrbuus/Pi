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

/// Вэбийн `components/nav/nav-data.ts`-ийн апп хувилбар (2026-11-01). Вэбд цэс өөрчлөгдвөл энд ч.
abstract final class NavData {
  static const _tools = NavLink('/app/tools', 'Хэрэглэгдэхүүн', AppIcons.tools);
  static const profile = NavLink('/app/profile', 'Миний мэдээлэл', AppIcons.user);

  static const _home = <UserRole, NavLink>{
    UserRole.groupTeacher: NavLink('/app/groups', 'Анги удирдах', AppIcons.students, short: 'Нүүр'),
    UserRole.student: NavLink('/app/student', 'Миний самбар', AppIcons.home, short: 'Нүүр'),
    UserRole.teacher: NavLink('/app/teacher', 'Багшийн самбар', AppIcons.home, short: 'Нүүр'),
    UserRole.teacherPlus: NavLink('/app/teacher', 'Багшийн самбар', AppIcons.home, short: 'Нүүр'),
    UserRole.admin: NavLink('/app/admin', 'Удирдлага', AppIcons.home, short: 'Нүүр'),
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
      NavLink('/app/study', 'Суралцах', AppIcons.library),
      NavLink('/app/study/history', 'Давтлага', AppIcons.history),
      NavLink('/app/practice', 'Дасгал', AppIcons.practice),
      NavLink('/app/learn', 'Хичээл үзэх', AppIcons.theory),
      NavLink('/app/videos', 'Онлайн хичээл', AppIcons.video),
      NavLink('/app/goals', 'Миний зорилго', AppIcons.goal, soon: true),
    ],
    UserRole.teacher: [_library, _videos, _tests, _schedule, _classes, _students, _adminTheory, _tools],
    UserRole.teacherPlus: [
      _internal, _import, _library, _videos, _tests, _payments, _leads, _sorils, _reconcile, _schedule,
      _adminTheory, _students, _analytics, _sms, _classes, _storeAdmin, _tools,
    ],
    UserRole.admin: [
      NavLink('/app/admin/v2', 'v2 ажлын хяналт', AppIcons.tests),
      NavLink('/app/admin/capabilities', 'Эрхийн матриц', AppIcons.shield),
      _internal,
      _import,
      NavLink('/app/teacher', 'Багшийн самбар', AppIcons.classes),
      NavLink('/app/teacher-hours', 'Цагийн бүртгэл', AppIcons.time),
      _library, _videos, _tests, _leads, _sorils, _reconcile, _schedule, _adminTheory, _students,
      NavLink('/app/admin/audit', 'Аудит', AppIcons.shield),
      _analytics, _sms, _classes,
      NavLink('/app/admin/finance', 'Санхүү', AppIcons.payments),
      NavLink('/app/admin/passes', 'Эрхийн удирдлага', AppIcons.key),
      _storeAdmin,
    ],
    UserRole.buyer: [
      NavLink('/app/results-ranking', 'Миний дүн, байр', AppIcons.ranking),
      NavLink('/app/study', 'Суралцах', AppIcons.theory),
      NavLink('/app/study/history', 'Давтлагын түүх', AppIcons.history),
      _library, _videos, _tests, _schedule, _store, _tools,
    ],
    UserRole.parent: [_schedule],
    UserRole.unknown: [],
  };

  /// Доод мөрөнд нүүрний дараа байнга харагдах (вэбийн `PRIMARY_BY_ROLE`).
  static const _primary = <UserRole, List<String>>{
    UserRole.groupTeacher: ['/app/library', '/app/videos'],
    UserRole.student: ['/app/homework', '/app/my-class', '/app/theory'],
    UserRole.teacher: ['/app/schedule', '/app/library', '/app/tests'],
    UserRole.teacherPlus: ['/app/schedule', '/app/payments', '/app/admin/students'],
    UserRole.admin: ['/app/admin/students', '/app/admin/leads', '/app/schedule'],
    UserRole.buyer: ['/app/library', '/app/videos', '/app/schedule'],
    UserRole.parent: ['/app/schedule'],
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
    '/app/payments': NavGroup.finance,
    '/app/sms': NavGroup.admin,
    '/app/goals': NavGroup.personal,
    '/app/student/payments': NavGroup.personal,
    '/app/homework': NavGroup.learn,
  };

  static const _staffGroupOrder = [
    NavGroup.classes, NavGroup.learn, NavGroup.finance, NavGroup.admin, NavGroup.internal, NavGroup.personal,
    NavGroup.soon,
  ];
  static const _groupOrder = [
    NavGroup.learn, NavGroup.classes, NavGroup.finance, NavGroup.admin, NavGroup.internal, NavGroup.personal,
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

  /// Доод таб: нүүр + гол холбоосууд («Бусад»-ыг shell нэмнэ).
  static List<NavLink> tabs(UserRole role) {
    final items = _byRole[role] ?? const <NavLink>[];
    return [
      home(role),
      for (final p in _primary[role] ?? const <String>[])
        ...items.where((i) => i.path == p).take(1),
    ];
  }

  /// «Бусад» дэлгэцийн бүлгүүд — доод табд ороогүй БҮХ холбоос (нэг ч цэс хасагдахгүй).
  static List<(NavGroup, List<NavLink>)> moreGroups(UserRole role) {
    final tabPaths = tabs(role).map((t) => t.path).toSet();
    final items = (_byRole[role] ?? const <NavLink>[]).where((i) => !tabPaths.contains(i.path));
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
      personal.where((p) => !tabPaths.contains(p.path) && !buckets[NavGroup.personal]!.any((b) => b.path == p.path)),
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
