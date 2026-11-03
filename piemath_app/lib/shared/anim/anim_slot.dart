/// Анимацын слотууд (`docs/RESEARCH-2026-11.md` §4). Слот бүр `assets/anim/manifest.yaml`-д нэг мөртэй
/// (`test/shared/anim/anim_manifest_test.dart` шалгана). Файл ирээгүй слот нь дуудагчийн `fallback`-ыг зурна.
enum AnimSlot {
  /// Нэвтрэх hero — MP4 + poster, `assets/login_hero/` (docs/LOGIN-HERO.md). Өөрийн тоглуулагчтай.
  loginHero('login_hero'),

  /// Анх нээхэд, 3 хуудас.
  onboarding1('onboarding_1'),
  onboarding2('onboarding_2'),
  onboarding3('onboarding_3'),

  /// Зөв хариу, 0.8с нэг удаа.
  correctBurst('correct_burst'),

  /// Шалгалтын дүн, 2.5с нэг удаа.
  examComplete('exam_complete'),

  /// Цуврал, ирц, 1.5с нэг удаа.
  streakUp('streak_up'),

  /// Даалгавар хоосон, давтагдана.
  emptyHomework('empty_homework'),

  /// Мэдэгдэлгүй, давтагдана.
  emptyNotifications('empty_notifications'),

  /// Төлбөр баталгаажсан, 1.5с нэг удаа.
  paymentSuccess('payment_success'),

  /// Интернэтгүй, давтагдана.
  offline('offline'),

  /// Дүр (Rive) — дараа. Rive сан нэмэгдээгүй тул үргэлж poster эсвэл fallback.
  mascot('mascot');

  const AnimSlot(this.key);

  /// Манифест дахь нэр (`snake_case`).
  final String key;

  static AnimSlot? byKey(String key) {
    for (final s in values) {
      if (s.key == key) return s;
    }
    return null;
  }
}

/// Слотын файлын төрөл.
enum AnimKind {
  /// Bodymovin JSON (`lottie` сан, цэвэр Dart).
  lottie,

  /// MP4 (H.264) — зөвхөн нэвтрэх hero, өөрийн widget-ээр тоглоно.
  video,

  /// Rive — сан нэмэгдээгүй; poster л харагдана.
  rive;

  static AnimKind? parse(Object? v) => switch (v) {
    'lottie' => lottie,
    'video' => video,
    'rive' => rive,
    _ => null,
  };
}
