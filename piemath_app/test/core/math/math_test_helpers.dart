import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';
import 'package:flutter/services.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

bool _katexLoaded = false;

/// flutter_math_fork-ийн KaTeX фонтуудыг golden-д ачаална (багцын фонт тул
/// `packages/flutter_math_fork/<family>` нэрээр бүртгэнэ).
Future<void> loadKatexFonts() async {
  if (_katexLoaded) return;
  _katexLoaded = true;
  final root = _packageRoot('flutter_math_fork');
  if (root == null) return;
  final dir = Directory('$root/lib/katex_fonts/fonts');
  if (!dir.existsSync()) return;
  final byFamily = <String, List<File>>{};
  for (final f in dir.listSync().whereType<File>()) {
    final name = f.uri.pathSegments.last;
    if (!name.endsWith('.ttf')) continue;
    final family = name.split('-').first; // KaTeX_Main-Regular.ttf → KaTeX_Main
    byFamily.putIfAbsent(family, () => []).add(f);
  }
  for (final e in byFamily.entries) {
    final loader = FontLoader('packages/flutter_math_fork/${e.key}');
    for (final f in e.value) {
      loader.addFont(Future.value(ByteData.view(f.readAsBytesSync().buffer)));
    }
    await loader.load();
  }
}

String? _packageRoot(String package) {
  final config = File('.dart_tool/package_config.json');
  if (!config.existsSync()) return null;
  final m = RegExp('"name":\\s*"$package",\\s*"rootUri":\\s*"([^"]+)"').firstMatch(config.readAsStringSync());
  if (m == null) return null;
  var root = m.group(1)!;
  if (root.startsWith('file://')) root = Uri.parse(root).toFilePath();
  if (!root.startsWith('/')) root = '${Directory('.dart_tool').absolute.path}/$root';
  return root;
}

/// Тестийн PNG (өнгөт дөрвөлжин, хүрээтэй) — [tester.runAsync] дотор дууд.
Future<Uint8List> makePng(int width, int height) async {
  final recorder = ui.PictureRecorder();
  final canvas = Canvas(recorder);
  canvas.drawRect(
    Rect.fromLTWH(0, 0, width.toDouble(), height.toDouble()),
    Paint()..color = const Color(0xFFFFFFFF),
  );
  canvas.drawRect(
    Rect.fromLTWH(2, 2, width - 4.0, height - 4.0),
    Paint()
      ..color = const Color(0xFF273F74)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3,
  );
  canvas.drawLine(Offset(4, height - 4.0), Offset(width - 4.0, 4), Paint()..color = const Color(0xFF3D6BC4)..strokeWidth = 3);
  final image = await recorder.endRecording().toImage(width, height);
  final data = await image.toByteData(format: ui.ImageByteFormat.png);
  return data!.buffer.asUint8List();
}

/// Ачаалахад алдаа өгдөг зураг (жишээ: 403 — эрх хараахан нээгдээгүй).
class FailingImage extends ImageProvider<FailingImage> {
  const FailingImage(this.statusCode);

  final int statusCode;

  @override
  Future<FailingImage> obtainKey(ImageConfiguration configuration) => SynchronousFuture(this);

  @override
  ImageStreamCompleter loadImage(FailingImage key, ImageDecoderCallback decode) {
    return OneFrameImageStreamCompleter(
      Future<ImageInfo>.error(NetworkImageLoadException(statusCode: statusCode, uri: Uri.parse('https://test/$statusCode'))),
    );
  }

  @override
  bool operator ==(Object other) => other is FailingImage && other.statusCode == statusCode;

  @override
  int get hashCode => statusCode.hashCode;
}

/// Хэзээ ч дуусахгүй ачаалалт (skeleton шалгах).
class PendingImage extends ImageProvider<PendingImage> {
  const PendingImage();

  @override
  Future<PendingImage> obtainKey(ImageConfiguration configuration) => SynchronousFuture(this);

  @override
  ImageStreamCompleter loadImage(PendingImage key, ImageDecoderCallback decode) =>
      OneFrameImageStreamCompleter(Completer<ImageInfo>().future);
}
