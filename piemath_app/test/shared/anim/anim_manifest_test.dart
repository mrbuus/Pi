import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/features/auth/ui/hero/login_hero_media.dart';
import 'package:piemath_app/shared/anim/anim_manifest.dart';
import 'package:piemath_app/shared/anim/anim_slot.dart';

AnimManifest _real() => AnimManifest.parse(File(AnimManifest.path).readAsStringSync());

void main() {
  test('AnimSlot бүр манифестэд нэг мөртэй, манифестэд илүү мөр алга', () {
    final m = _real();
    for (final s in AnimSlot.values) {
      expect(m[s], isNotNull, reason: '${s.key} манифестэд алга');
      expect(m[s]!.maxKb, greaterThan(0));
    }
    expect(m.entries.length, AnimSlot.values.length);
  });

  test('байгаа файл бүр max_kb-аас хэтрэхгүй (poster нь poster_max_kb)', () {
    final over = <String>[];
    for (final e in _real().entries.values) {
      for (final f in e.files) {
        final file = File(f.path);
        if (!file.existsSync()) continue;
        final kb = file.lengthSync() / 1024;
        if (kb > f.maxKb) over.add('${f.path}: ${kb.toStringAsFixed(1)}KB > ${f.maxKb}KB');
      }
    }
    expect(over, isEmpty, reason: over.join('\n'));
  });

  test('pubspec-д assets/anim/ бүртгэлтэй, Rive сан нэмээгүй', () {
    final pubspec = File('pubspec.yaml').readAsStringSync();
    expect(pubspec, contains('- assets/anim/'));
    expect(pubspec, contains('lottie:'));
    expect(RegExp(r'^\s+rive:', multiLine: true).hasMatch(pubspec), isFalse);
  });

  test('login_hero мөр LoginHeroFiles-тэй ижил файлыг заана', () {
    final e = _real()[AnimSlot.loginHero]!;
    expect(e.kind, AnimKind.video);
    expect(e.file, LoginHeroFiles.video);
    expect(e.fileDark, LoginHeroFiles.videoDark);
    expect(e.poster, '${LoginHeroFiles.dir}${LoginHeroFiles.posterNames.first}');
    expect(e.posterDark, '${LoginHeroFiles.dir}${LoginHeroFiles.posterDarkNames.first}');
    expect(e.loop, isTrue);
  });

  test('давталт, урт RESEARCH §4-тэй таарна', () {
    final m = _real();
    for (final s in [AnimSlot.correctBurst, AnimSlot.examComplete, AnimSlot.streakUp, AnimSlot.paymentSuccess]) {
      expect(m[s]!.loop, isFalse, reason: s.key);
    }
    for (final s in [AnimSlot.emptyHomework, AnimSlot.emptyNotifications, AnimSlot.offline, AnimSlot.onboarding1]) {
      expect(m[s]!.loop, isTrue, reason: s.key);
    }
    expect(m[AnimSlot.correctBurst]!.maxKb, 40);
    expect(m[AnimSlot.mascot]!.kind, AnimKind.rive);
  });

  group('parse', () {
    const src = '''
slots:
  correct_burst:
    kind: lottie
    file: correct_burst.json
    dark: correct_burst.dark.json
    poster: correct_burst.poster.webp
    loop: false
    max_kb: 40
  offline:
    kind: gif
    file: offline.gif
    max_kb: 50
  unknown_slot:
    kind: lottie
    file: x.json
    max_kb: 10
  exam_complete:
    kind: lottie
    max_kb: 10
''';

    test('харьцангуй зам assets/anim/-ээс, буруу мөр алгасагдана', () {
      final m = AnimManifest.parse(src);
      expect(m.entries.keys, [AnimSlot.correctBurst]);
      final e = m[AnimSlot.correctBurst]!;
      expect(e.file, 'assets/anim/correct_burst.json');
      expect(e.fileDark, 'assets/anim/correct_burst.dark.json');
      expect(e.posterMaxKb, AnimManifest.defaultPosterMaxKb);
    });

    test('bundle-д байгаа файл л буцна; харанхуйд .dark, байхгүй бол ердийнх', () {
      final none = AnimManifest.parse(src);
      expect(none.fileFor(AnimSlot.correctBurst, dark: false), isNull);
      expect(none.posterFor(AnimSlot.correctBurst, dark: false), isNull);

      final some = AnimManifest.parse(
        src,
        bundled: {'assets/anim/correct_burst.json', 'assets/anim/correct_burst.poster.webp', 'assets/brand/x.png'},
      );
      expect(some.bundled, isNot(contains('assets/brand/x.png')));
      expect(some.fileFor(AnimSlot.correctBurst, dark: true), 'assets/anim/correct_burst.json');
      expect(some.posterFor(AnimSlot.correctBurst, dark: true), 'assets/anim/correct_burst.poster.webp');

      final dark = AnimManifest.parse(
        src,
        bundled: {'assets/anim/correct_burst.json', 'assets/anim/correct_burst.dark.json'},
      );
      expect(dark.fileFor(AnimSlot.correctBurst, dark: true), 'assets/anim/correct_burst.dark.json');
      expect(dark.fileFor(AnimSlot.correctBurst, dark: false), 'assets/anim/correct_burst.json');
    });

    test('эвдэрсэн YAML апп унагахгүй — хоосон манифест', () {
      expect(AnimManifest.parse('slots: [').entries, isEmpty);
      expect(AnimManifest.parse('').entries, isEmpty);
    });
  });

  testWidgets('load(): апп-ын bundle-ээс нэг удаа уншина, одоо бүх слот файлгүй', (tester) async {
    AnimManifest.debugOverride(null);
    addTearDown(() => AnimManifest.debugOverride(null));
    final m = (await tester.runAsync(AnimManifest.load))!;
    expect(m.entries.length, AnimSlot.values.length);
    expect(identical(AnimManifest.cached, m), isTrue);
    for (final s in AnimSlot.values.where((s) => s != AnimSlot.loginHero)) {
      expect(m.fileFor(s, dark: false), isNull, reason: '${s.key}: файл хүргэгдээгүй тул fallback');
    }
  });
}
