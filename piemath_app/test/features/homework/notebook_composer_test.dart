import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/core/ui/theme.dart';
import 'package:piemath_app/features/homework/data/photo_processor.dart';
import 'package:piemath_app/features/homework/ui/composer/notebook_composer_screen.dart';

import '../../helpers/fonts.dart';
import 'composer_fakes.dart';

class ComposerHarness {
  ComposerHarness({FakePhotoSource? source, FakePhotoProcessor? processor})
      : source = source ?? FakePhotoSource(),
        processor = processor ?? FakePhotoProcessor();

  final FakePhotoSource source;
  final FakePhotoProcessor processor;
  final submitted = <List<String>>[];
  Object? failWith;
  bool? result;
  bool opened = false;
}

/// «Нээх» товчоор [NotebookComposerScreen]-ийг бодит `Navigator`-оор нээнэ.
Future<ComposerHarness> pumpComposer(
  WidgetTester tester, {
  FakePhotoSource? source,
  FakePhotoProcessor? processor,
  int maxPages = 6,
  List<Override> overrides = const [],
}) async {
  final h = ComposerHarness(source: source, processor: processor);
  tester.view.physicalSize = const Size(390, 844) * 2;
  tester.view.devicePixelRatio = 2;
  addTearDown(tester.view.reset);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        photoSourceProvider.overrideWithValue(h.source),
        photoProcessorProvider.overrideWithValue(h.processor),
        ...overrides,
      ],
      child: MaterialApp(
        theme: AppTheme.light(),
        home: Builder(
          builder: (context) => Scaffold(
            body: Center(
              child: TextButton(
                onPressed: () async {
                  h.opened = true;
                  h.result = await NotebookComposerScreen.open(
                    context,
                    title: 'Дэвтрийн зураг',
                    subtitle: '10-р сарын 26, 6 хүртэл хуудас',
                    maxPages: maxPages,
                    onSubmit: (pages, note, progress, cancel) async {
                      if (h.failWith != null) throw h.failWith!;
                      h.submitted.add([for (final p in pages) p.name]);
                    },
                  );
                },
                child: const Text('Нээх'),
              ),
            ),
          ),
        ),
      ),
    ),
  );
  await tester.tap(find.text('Нээх'));
  await _settle(tester);
  return h;
}

Future<void> _settle(WidgetTester tester, {int frames = 14}) async {
  for (var i = 0; i < frames; i++) {
    await tester.pump(const Duration(milliseconds: 50));
  }
}

Future<void> _addByCamera(WidgetTester tester) async {
  await tester.tap(find.text('Камер'));
  await _settle(tester);
  expect(find.text('Хуудсаа тайрах'), findsOneWidget);
  await tester.tap(find.text('Болсон'));
  await _settle(tester);
}

void main() {
  setUpAll(loadAppFonts);

  testWidgets('эхлэх төлөв: 0/6 тоолуур, зөвлөмж, илгээх идэвхгүй', (tester) async {
    await pumpComposer(tester);
    expect(find.text('0/6'), findsOneWidget);
    expect(find.text('хуудас'), findsOneWidget);
    expect(find.textContaining('ойртуулж'), findsOneWidget);
    final send = tester.widget<FilledButton>(find.byType(FilledButton));
    expect(send.onPressed, isNull);
    expect(find.textContaining('PDF'), findsNothing);
  });

  testWidgets('камер → тайрах алхам → «Болсон»: 1/6, илгээх товчинд хуудасны тоо', (tester) async {
    final h = await pumpComposer(tester, source: FakePhotoSource(camera: ['a']));
    await _addByCamera(tester);
    expect(find.text('1/6'), findsOneWidget);
    expect(find.text('Илгээх (1 хуудас)'), findsOneWidget);
    expect(h.processor.crops, isEmpty, reason: 'тайраагүй бол дахин боловсруулахгүй');
  });

  testWidgets('бүдэг зураг: тайрах дэлгэц дээр зөвлөмж, «Дахин авах» нь шинэ зураг авна', (tester) async {
    final processor = FakePhotoProcessor()..sharpQueue.addAll([5, 200]);
    final source = FakePhotoSource(camera: ['blur', 'sharp']);
    await pumpComposer(tester, source: source, processor: processor);
    await tester.tap(find.text('Камер'));
    await _settle(tester);
    expect(find.textContaining('бүдэг харагдаж байна'), findsOneWidget);
    await tester.tap(find.text('Дахин авах'));
    await _settle(tester);
    // Хоёр дахь зураг тод — зөвлөмжгүй тайрах дэлгэц.
    expect(find.text('Хуудсаа тайрах'), findsOneWidget);
    expect(find.textContaining('бүдэг харагдаж байна'), findsNothing);
    await tester.tap(find.text('Болсон'));
    await _settle(tester);
    expect(source.cameraCalls, 2);
    expect(find.text('1/6'), findsOneWidget);
  });

  testWidgets('бүдэг зургийг «Болсон»-оор үлдээж болно (хориглохгүй), хуудсанд анхааруулга', (tester) async {
    final processor = FakePhotoProcessor()..sharpQueue.add(5);
    await pumpComposer(tester, source: FakePhotoSource(camera: ['blur']), processor: processor);
    await tester.tap(find.text('Камер'));
    await _settle(tester);
    await tester.tap(find.text('Болсон'));
    await _settle(tester);
    expect(find.text('1/6'), findsOneWidget);
    expect(find.text('1-р хуудас бүдэг харагдаж байна'), findsOneWidget);
  });

  testWidgets('тайрах: булан чирвэл «Тайрах», шинэ зураг + тайралт зөв', (tester) async {
    final processor = FakePhotoProcessor();
    await pumpComposer(tester, source: FakePhotoSource(camera: ['a']), processor: processor);
    await tester.tap(find.text('Камер'));
    await _settle(tester);
    final box = tester.getRect(find.descendant(of: find.byType(Scaffold).last, matching: find.byType(Image)).first);
    await tester.dragFrom(box.bottomRight - const Offset(1, 1), Offset(-box.width * 0.3, -box.height * 0.2));
    await tester.pump();
    expect(find.text('Тайрах'), findsOneWidget);
    await tester.tap(find.text('Тайрах'));
    await _settle(tester);
    expect(processor.crops, hasLength(1));
    final rect = processor.crops.single.$2;
    expect(rect.left, 0);
    expect(rect.top, 0);
    expect(rect.right, closeTo(0.7, 0.03));
    expect(rect.bottom, closeTo(0.8, 0.03));
    expect(find.text('1/6'), findsOneWidget);
  });

  testWidgets('тайрах: «Бүтэн» дарахад анхны хүрээ', (tester) async {
    await pumpComposer(tester, source: FakePhotoSource(camera: ['a']));
    await tester.tap(find.text('Камер'));
    await _settle(tester);
    final box = tester.getRect(find.descendant(of: find.byType(Scaffold).last, matching: find.byType(Image)).first);
    await tester.dragFrom(box.topLeft + const Offset(1, 1), Offset(box.width * 0.3, box.height * 0.3));
    await tester.pump();
    expect(find.text('Тайрах'), findsOneWidget);
    await tester.tap(find.text('Бүтэн'));
    await tester.pump();
    expect(find.text('Болсон'), findsOneWidget);
  });

  testWidgets('тайрах алдаатай бол мессеж гарч, дэлгэц хэвээр (зураг алдагдахгүй)', (tester) async {
    final processor = FakePhotoProcessor()..failCrop = true;
    await pumpComposer(tester, source: FakePhotoSource(camera: ['a']), processor: processor);
    await tester.tap(find.text('Камер'));
    await _settle(tester);
    final box = tester.getRect(find.descendant(of: find.byType(Scaffold).last, matching: find.byType(Image)).first);
    await tester.dragFrom(box.bottomRight - const Offset(1, 1), const Offset(-60, -60));
    await tester.pump();
    await tester.tap(find.text('Тайрах'));
    await _settle(tester);
    expect(find.textContaining('Зургийг тайрч чадсангүй'), findsOneWidget);
    expect(find.text('Хуудсаа тайрах'), findsOneWidget);
  });

  testWidgets('тайрах дэлгэцийг хаавал зураг нэмэгдэхгүй', (tester) async {
    await pumpComposer(tester, source: FakePhotoSource(camera: ['a']));
    await tester.tap(find.text('Камер'));
    await _settle(tester);
    await tester.tap(find.byTooltip('Хаах'));
    await _settle(tester);
    expect(find.text('0/6'), findsOneWidget);
  });

  testWidgets('зургийн сан: олон зураг, бүдэг нь хуудас дээр тэмдэглэгдэнэ, «Дахин авах» нь солино', (tester) async {
    final processor = FakePhotoProcessor()..sharpQueue.addAll([200, 5, 200, 200]);
    final source = FakePhotoSource(
      gallery: [
        ['g1', 'g2', 'g3'],
      ],
      camera: ['cam'],
    );
    final semantics = tester.ensureSemantics();
    await pumpComposer(tester, source: source, processor: processor);
    await tester.tap(find.text('Зургийн сан'));
    await _settle(tester);
    expect(find.text('3/6'), findsOneWidget);
    expect(find.text('2-р хуудас бүдэг харагдаж байна'), findsOneWidget);
    expect(find.bySemanticsLabel(RegExp(r'^2-р хуудас, бүдэг')), findsOneWidget);
    // Анхааруулгын «Дахин авах» → камер → тайрах → «Болсон» → 2-р хуудсыг солино.
    await tester.tap(find.text('Дахин авах'));
    await _settle(tester);
    await tester.tap(find.text('Болсон'));
    await _settle(tester);
    expect(find.text('3/6'), findsOneWidget);
    expect(find.textContaining('бүдэг харагдаж байна'), findsNothing);
    semantics.dispose();
  });

  testWidgets('хуудасны цэс: дараа нь шилжүүлэх, өмнө нь шилжүүлэх, хасах → илгээхэд дараалал', (tester) async {
    final semantics = tester.ensureSemantics();
    final h = await pumpComposer(
      tester,
      source: FakePhotoSource(gallery: [
        ['p1', 'p2', 'p3'],
      ]),
    );
    await tester.tap(find.text('Зургийн сан'));
    await _settle(tester);
    // p1-ийг дараа нь шилжүүлэх → p2, p1, p3
    await tester.tap(find.bySemanticsLabel(RegExp(r'^1-р хуудас')));
    await _settle(tester);
    expect(find.text('Өмнө нь шилжүүлэх'), findsNothing, reason: 'эхний хуудсанд «өмнө» байхгүй');
    await tester.tap(find.text('Дараа нь шилжүүлэх'));
    await _settle(tester);
    // p3 (3-р хуудас)-ийг өмнө нь шилжүүлэх → p2, p3, p1
    await tester.tap(find.bySemanticsLabel(RegExp(r'^3-р хуудас')));
    await _settle(tester);
    expect(find.text('Дараа нь шилжүүлэх'), findsNothing, reason: 'сүүлийн хуудсанд «дараа» байхгүй');
    await tester.tap(find.text('Өмнө нь шилжүүлэх'));
    await _settle(tester);
    // 2-р хуудсыг хасах
    await tester.tap(find.bySemanticsLabel(RegExp(r'^2-р хуудас')));
    await _settle(tester);
    await tester.tap(find.text('Хасах'));
    await _settle(tester);
    expect(find.text('2/6'), findsOneWidget);
    await tester.tap(find.text('Илгээх (2 хуудас)'));
    await _settle(tester);
    expect(h.submitted.single, ['p2', 'p1']);
    expect(h.result, isTrue);
    semantics.dispose();
  });

  testWidgets('удаан дараад чирч эрэмбэлнэ', (tester) async {
    final h = await pumpComposer(
      tester,
      source: FakePhotoSource(gallery: [
        ['a', 'b', 'c'],
      ]),
    );
    await tester.tap(find.text('Зургийн сан'));
    await _settle(tester);
    final thumbs = find.byType(ReorderableDelayedDragStartListener);
    expect(thumbs, findsNWidgets(3));
    final from = tester.getCenter(thumbs.at(0));
    final gesture = await tester.startGesture(from);
    await tester.pump(const Duration(milliseconds: 700));
    await gesture.moveBy(const Offset(120, 0));
    await tester.pump(const Duration(milliseconds: 100));
    await gesture.moveBy(const Offset(120, 0));
    await tester.pump(const Duration(milliseconds: 100));
    await gesture.up();
    await _settle(tester);
    await tester.tap(find.text('Илгээх (3 хуудас)'));
    await _settle(tester);
    expect(h.submitted.single.first, isNot('a'), reason: 'эхний зураг дараагийн байранд очсон');
    expect(h.submitted.single.toSet(), {'a', 'b', 'c'});
  });

  testWidgets('дээд хязгаарт хүрвэл нэмэх товчнууд идэвхгүй', (tester) async {
    await pumpComposer(
      tester,
      maxPages: 2,
      source: FakePhotoSource(gallery: [
        ['a', 'b', 'c'],
      ]),
    );
    await tester.tap(find.text('Зургийн сан'));
    await _settle(tester);
    expect(find.text('2/2'), findsOneWidget, reason: 'дээд талын дараах зураг нэмэгдэхгүй');
    expect(find.text('2 хуудас хүрлээ'), findsOneWidget);
    expect(tester.widget<OutlinedButton>(find.widgetWithText(OutlinedButton, 'Камер')).onPressed, isNull);
    expect(tester.widget<OutlinedButton>(find.widgetWithText(OutlinedButton, 'Зургийн сан')).onPressed, isNull);
  });

  testWidgets('илгээх алдаа: серверийн мессеж гарч, зураг хэвээр, дахин илгээж болно', (tester) async {
    final h = await pumpComposer(tester, source: FakePhotoSource(camera: ['a']));
    h.failWith = const ApiError(ApiErrorKind.conflict, 'Хугацаа дууссан');
    await _addByCamera(tester);
    await tester.tap(find.text('Илгээх (1 хуудас)'));
    await _settle(tester);
    expect(find.text('Хугацаа дууссан'), findsOneWidget);
    expect(find.text('1/6'), findsOneWidget);
    h.failWith = null;
    await tester.tap(find.text('Илгээх (1 хуудас)'));
    await _settle(tester);
    expect(h.result, isTrue);
    expect(h.submitted, hasLength(1));
  });

  testWidgets('гарахад зураг байвал баталгаажуулна: «Үргэлжлүүлэх» ба «Хаях»', (tester) async {
    final h = await pumpComposer(tester, source: FakePhotoSource(camera: ['a']));
    await _addByCamera(tester);
    await tester.tap(find.byTooltip('Хаах'));
    await _settle(tester);
    expect(find.text('Авсан зургуудаа хаях уу?'), findsOneWidget);
    await tester.tap(find.text('Үргэлжлүүлэх'));
    await _settle(tester);
    expect(find.text('1/6'), findsOneWidget);
    await tester.tap(find.byTooltip('Хаах'));
    await _settle(tester);
    await tester.tap(find.text('Хаях'));
    await _settle(tester);
    expect(h.result, isFalse);
  });

  testWidgets('зураггүй бол шууд хаагдана', (tester) async {
    final h = await pumpComposer(tester);
    await tester.tap(find.byTooltip('Хаах'));
    await _settle(tester);
    expect(h.result, isFalse);
  });

  testWidgets('зөвшөөрөл өгөөгүй: Тохиргоо руу заасан тайлбар', (tester) async {
    final source = _DeniedSource();
    await pumpComposer(tester, source: source);
    await tester.tap(find.text('Камер'));
    await _settle(tester);
    expect(find.textContaining('зөвшөөрөл өгөөгүй'), findsOneWidget);
    expect(find.text('0/6'), findsOneWidget);
  });
}

class _DeniedSource extends FakePhotoSource {
  @override
  Future<PhotoPage?> takePhoto() async => throw PlatformException(code: 'camera_access_denied');
}
