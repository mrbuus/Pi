import 'package:flutter/material.dart';

/// Дизайны токенууд — апп-д өнгийг ЗӨВХӨН эндээс авна (RULES.md §3).
///
/// Нэрс нь вэбийн `globals.css`-ийн токентой ижил утгатай (`bg`, `surface`, `line`, `ink`,
/// `inkDim`, `brand` …) тул хоёр кодын санг харьцуулахад төөрөхгүй.
///
/// Апп-ын өнгө логоны хар хөх `#273F74`-оос гаргасан (эзэн 2026-11-01):
/// үндсэн хөх + цагаан, зөөлөн цэнхэр `#AFC4EF`, тодотгол `#76B6F7`.
/// **Шар/алтан өнгө ХОРИОТОЙ.** Өнгөт дэвсгэртэй карт ХОРИОТОЙ — карт саарал/цагаан,
/// өнгө зөвхөн төлөвийн дүрс, жижиг тэмдэгт.
///
/// Контраст `surface` дээр (WCAG AA 4.5:1-ээс багагүй, `test/core/ui/tokens_test.dart` шалгана):
/// цагаан горим — ink 18.0, inkDim 7.4, brand 10.2, success 5.4, warning 5.5, error 6.5, info 6.5;
/// хар горим — ink 13.9, inkDim 7.9, brand 9.5, success 8.7, warning 7.9, error 7.0, info 8.9.
@immutable
class AppColors extends ThemeExtension<AppColors> {
  const AppColors({
    required this.bg,
    required this.surface,
    required this.surfaceSunken,
    required this.line,
    required this.ink,
    required this.inkDim,
    required this.brand,
    required this.brandBright,
    required this.brandSoft,
    required this.brandTint,
    required this.onBrand,
    required this.logo,
    required this.success,
    required this.warning,
    required this.error,
    required this.info,
    required this.onStatus,
    required this.skeleton,
    required this.focus,
    required this.lip,
    required this.teal,
    required this.tealTint,
    required this.violet,
    required this.violetTint,
    required this.successTint,
    required this.warningTint,
    required this.errorTint,
    required this.infoTint,
  });

  /// Хуудасны дэвсгэр.
  final Color bg;

  /// Карт, самбар (цагаан / хар горимд бараан саарал).
  final Color surface;

  /// Картын доторх бүлэглэл, оролтын талбарын дэвсгэр (маш бага ялгаатай саарал).
  final Color surfaceSunken;

  /// Хүрээ, хуваагч зураас.
  final Color line;

  /// Үндсэн бичвэр.
  final Color ink;

  /// Туслах бичвэр (огноо, мета).
  final Color inkDim;

  /// Брэндийн үндсэн хөх — товч, идэвхтэй таб, холбоос.
  final Color brand;

  /// Тодотгол — фокус, сонгогдсон төлөвийн зураас.
  final Color brandBright;

  /// Брэндийн зөөлөн өнгө — бичвэрт (гарчгийн тодотгол).
  final Color brandSoft;

  /// Маш цайвар хөх — сонгогдсон навигацийн «pill», жижиг тэмдэг. Картын дэвсгэр БИШ.
  final Color brandTint;

  /// Брэндийн өнгөт дэвсгэр дээрх бичвэр/дүрс.
  final Color onBrand;

  /// Логоны өнгө (танхимын дүрс, тэмдэг).
  final Color logo;

  final Color success;
  final Color warning;
  final Color error;
  final Color info;

  /// success/warning/error/info дэвсгэр дээрх бичвэр.
  final Color onStatus;

  /// Ачаалж буй (skeleton) хайрцгийн өнгө.
  final Color skeleton;

  /// Гарнаас удирдах үеийн фокусын хүрээ.
  final Color focus;

  /// Картын доод «уруул» — вэбийн `chunky` (2px хүрээ + 4px доод хүрээ)-тэй ижил «сурах бичгийн 3D».
  /// Сүүдэр, blur биш — хатуу өнгө.
  final Color lip;

  /// Туслах өнгөний зохицол (эзэн 2026-11-10): логоны хар хөхтэй OKLCH-д ижил гэрэлтэлт, дунд зэргийн
  /// ханалттай. Ангилал, хэсгийг ялгах ЖИЖИГ дүрсний хавтан ([teal] + [tealTint] г.м.), дүрс, шошгонд л —
  /// картын дэвсгэрт ХЭЗЭЭ Ч биш. 60/30/10: саарал/цагаан 60, хар хөх 30, эдгээр 10-аас бага.
  final Color teal;
  final Color tealTint;
  final Color violet;
  final Color violetTint;

  /// Төлөвийн өнгөний маш цайвар дэвсгэр — жижиг шошго (pill), дүрсний хавтанд. Дээрх төлөвийн өнгөтэй
  /// контраст хамгийн багадаа 4.5 (`tokens_test`).
  final Color successTint;
  final Color warningTint;
  final Color errorTint;
  final Color infoTint;

  static const light = AppColors(
    // Саарал нь брэндийн өнгөний тойрог (OKLCH h≈264) руу бага зэрэг хазайсан —
    // «хар-цагаан» биш тайван хүйтэн саарал (UX-RESEARCH §2).
    bg: Color(0xFFF5F7FB),
    surface: Color(0xFFFFFFFF),
    surfaceSunken: Color(0xFFEBEFF5),
    line: Color(0xFFD7DBE3),
    ink: Color(0xFF181E2A),
    inkDim: Color(0xFF4E5564),
    brand: Color(0xFF273F74),
    brandBright: Color(0xFF3D6BC4),
    brandSoft: Color(0xFF1E3366),
    brandTint: Color(0xFFE3EBFA),
    onBrand: Color(0xFFFFFFFF),
    logo: Color(0xFF273F74),
    success: Color(0xFF1E7A35),
    warning: Color(0xFFB04A0C),
    error: Color(0xFFB3261E),
    info: Color(0xFF0B5FA8),
    onStatus: Color(0xFFFFFFFF),
    skeleton: Color(0xFFE6E9EE),
    focus: Color(0xFF76B6F7),
    lip: Color(0xFFC5CBD6),
    // OKLCH: teal L.50 C.09 h195, violet L.48 C.12 h298; дэвсгэр L.955 C.024.
    teal: Color(0xFF007373),
    tealTint: Color(0xFFDFF6F5),
    violet: Color(0xFF674C98),
    violetTint: Color(0xFFF2EDFF),
    successTint: Color(0xFFE6F5E7),
    warningTint: Color(0xFFFFECE3),
    errorTint: Color(0xFFFFEBE7),
    infoTint: Color(0xFFE5F2FF),
  );

  static const dark = AppColors(
    bg: Color(0xFF0F1319),
    surface: Color(0xFF1A1E26),
    surfaceSunken: Color(0xFF15181F),
    line: Color(0xFF383D48),
    ink: Color(0xFFE3E6ED),
    inkDim: Color(0xFFB2B8C3),
    brand: Color(0xFFAFC4EF),
    brandBright: Color(0xFF76B6F7),
    brandSoft: Color(0xFFC9D7F5),
    brandTint: Color(0xFF1E2B47),
    onBrand: Color(0xFF0F1D3A),
    logo: Color(0xFF9AB7F2),
    success: Color(0xFF6FCF8F),
    warning: Color(0xFFF2A066),
    error: Color(0xFFF28B82),
    info: Color(0xFF7FC4FF),
    onStatus: Color(0xFF111317),
    skeleton: Color(0xFF262A31),
    focus: Color(0xFF76B6F7),
    lip: Color(0xFF2B303A),
    // OKLCH: L.82 C.09 (зөөлөн, гэрэлтэлтгүй); дэвсгэр L.29 C.04.
    teal: Color(0xFF78D7D6),
    tealTint: Color(0xFF0E3231),
    violet: Color(0xFFCBB8F7),
    violetTint: Color(0xFF2E273D),
    successTint: Color(0xFF1B3122),
    warningTint: Color(0xFF3B2617),
    errorTint: Color(0xFF3D2321),
    infoTint: Color(0xFF1A2D3E),
  );

  /// Логоны дугуй дэвсгэр (хоёр горимд ижил — лого өөрөө).
  static const logoNavy = Color(0xFF273F74);

  /// Модал, sheet-ийн ард бүдгэрүүлэх давхарга.
  static const scrim = Color(0x99000000);

  @override
  AppColors copyWith({
    Color? bg,
    Color? surface,
    Color? surfaceSunken,
    Color? line,
    Color? ink,
    Color? inkDim,
    Color? brand,
    Color? brandBright,
    Color? brandSoft,
    Color? brandTint,
    Color? onBrand,
    Color? logo,
    Color? success,
    Color? warning,
    Color? error,
    Color? info,
    Color? onStatus,
    Color? skeleton,
    Color? focus,
    Color? lip,
    Color? teal,
    Color? tealTint,
    Color? violet,
    Color? violetTint,
    Color? successTint,
    Color? warningTint,
    Color? errorTint,
    Color? infoTint,
  }) {
    return AppColors(
      bg: bg ?? this.bg,
      surface: surface ?? this.surface,
      surfaceSunken: surfaceSunken ?? this.surfaceSunken,
      line: line ?? this.line,
      ink: ink ?? this.ink,
      inkDim: inkDim ?? this.inkDim,
      brand: brand ?? this.brand,
      brandBright: brandBright ?? this.brandBright,
      brandSoft: brandSoft ?? this.brandSoft,
      brandTint: brandTint ?? this.brandTint,
      onBrand: onBrand ?? this.onBrand,
      logo: logo ?? this.logo,
      success: success ?? this.success,
      warning: warning ?? this.warning,
      error: error ?? this.error,
      info: info ?? this.info,
      onStatus: onStatus ?? this.onStatus,
      skeleton: skeleton ?? this.skeleton,
      focus: focus ?? this.focus,
      lip: lip ?? this.lip,
      teal: teal ?? this.teal,
      tealTint: tealTint ?? this.tealTint,
      violet: violet ?? this.violet,
      violetTint: violetTint ?? this.violetTint,
      successTint: successTint ?? this.successTint,
      warningTint: warningTint ?? this.warningTint,
      errorTint: errorTint ?? this.errorTint,
      infoTint: infoTint ?? this.infoTint,
    );
  }

  @override
  AppColors lerp(ThemeExtension<AppColors>? other, double t) {
    if (other is! AppColors) return this;
    Color l(Color a, Color b) => Color.lerp(a, b, t)!;
    return AppColors(
      bg: l(bg, other.bg),
      surface: l(surface, other.surface),
      surfaceSunken: l(surfaceSunken, other.surfaceSunken),
      line: l(line, other.line),
      ink: l(ink, other.ink),
      inkDim: l(inkDim, other.inkDim),
      brand: l(brand, other.brand),
      brandBright: l(brandBright, other.brandBright),
      brandSoft: l(brandSoft, other.brandSoft),
      brandTint: l(brandTint, other.brandTint),
      onBrand: l(onBrand, other.onBrand),
      logo: l(logo, other.logo),
      success: l(success, other.success),
      warning: l(warning, other.warning),
      error: l(error, other.error),
      info: l(info, other.info),
      onStatus: l(onStatus, other.onStatus),
      skeleton: l(skeleton, other.skeleton),
      focus: l(focus, other.focus),
      lip: l(lip, other.lip),
      teal: l(teal, other.teal),
      tealTint: l(tealTint, other.tealTint),
      violet: l(violet, other.violet),
      violetTint: l(violetTint, other.violetTint),
      successTint: l(successTint, other.successTint),
      warningTint: l(warningTint, other.warningTint),
      errorTint: l(errorTint, other.errorTint),
      infoTint: l(infoTint, other.infoTint),
    );
  }
}

/// Зай (4dp сүлжээ).
abstract final class AppSpace {
  static const double xs = 4;
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;
  static const double xl = 24;
  static const double xxl = 32;

  /// Утасны хажуугийн зай (вэбийн 375px дээрх 16px-тэй ижил).
  static const double gutter = 16;
}

/// Булангийн радиус.
abstract final class AppRadius {
  static const double sm = 8;
  static const double md = 12;
  static const double lg = 16;

  /// Том карт (вэбийн `chunky` 1.5rem-ийн апп хувилбар — утасны дэлгэцэнд арай бага).
  static const double xl = 20;
  static const double pill = 999;
}

/// Хэмнэл — вэбийн `--dur-micro/base/enter`.
abstract final class AppMotion {
  static const micro = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 180);
  static const enter = Duration(milliseconds: 260);

  /// Хөдөлгөөн багасгах тохиргоо: Android «Remove animations» (`disableAnimations`)
  /// эсвэл iOS «Reduce Motion» (`accessibilityFeatures.reduceMotion`).
  static bool reduced(BuildContext context) =>
      (MediaQuery.maybeDisableAnimationsOf(context) ?? false) ||
      WidgetsBinding.instance.platformDispatcher.accessibilityFeatures.reduceMotion;

  /// Хөдөлгөөн багасгах үед анимацгүй.
  static Duration of(BuildContext context, Duration d) =>
      reduced(context) ? Duration.zero : d;
}

/// Хэмжээний хязгаар.
abstract final class AppSizes {
  /// Хүрэх талбайн доод хэмжээ — Material 48dp (хүүхэд гараа илүү алддаг, UX-RESEARCH §2).
  static const double minTap = 48;

  /// Таблетын хил: үүнээс өргөн бол зүүн rail цэс.
  static const double tabletBreakpoint = 768;

  /// Унших бичвэрийн дээд өргөн (вэбийн `--measure` ~68ch).
  static const double readableWidth = 720;
}

/// Ангилал, хэсгийг ялгах өнгө (дүрсний хавтан, шошго). Утга бүр нь [AppColors]-ийн хос өнгө:
/// [fg] — дүрс/бичвэр (surface, [tint] дээр хамгийн багадаа 4.5:1), [tint] — жижиг хавтангийн дэвсгэр.
enum AppHue {
  brand,
  teal,
  violet,
  success,
  warning,
  error,
  info,
  neutral;

  Color fg(AppColors c) => switch (this) {
    brand => c.brand,
    teal => c.teal,
    violet => c.violet,
    success => c.success,
    warning => c.warning,
    error => c.error,
    info => c.info,
    neutral => c.inkDim,
  };

  Color tint(AppColors c) => switch (this) {
    brand => c.brandTint,
    teal => c.tealTint,
    violet => c.violetTint,
    success => c.successTint,
    warning => c.warningTint,
    error => c.errorTint,
    info => c.infoTint,
    neutral => c.surfaceSunken,
  };
}

extension AppThemeX on BuildContext {
  /// `context.colors.ink` гэх мэт.
  AppColors get colors => Theme.of(this).extension<AppColors>()!;

  TextTheme get text => Theme.of(this).textTheme;
}
