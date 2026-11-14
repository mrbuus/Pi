import 'dart:io';
import 'dart:ui' show Rect;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// `GET /schedule/me/ics`-ийн хариу: файлын нэр + `.ics` агуулга.
class IcsExport {
  const IcsExport({required this.filename, required this.ics});

  factory IcsExport.fromJson(Object? raw) {
    final m = raw is Map ? raw.cast<String, Object?>() : const <String, Object?>{};
    return IcsExport(filename: m['filename'] as String? ?? '', ics: m['ics'] as String? ?? '');
  }

  final String filename;
  final String ics;

  /// Хуанлид нэмэх хичээлийн үйл явдал байгаа эсэх (хоосон хуваарьт зөвхөн хүрээ л ирнэ).
  bool get hasEvents => ics.contains('BEGIN:VEVENT');
}

/// `.ics` файлыг утасны хуанли руу хуваалцах үйлдэл. Тестэд солино.
abstract class IcsOpener {
  /// [origin] — iPad-ийн хуваалцах цонхны байрлал (товчны дэлгэц дээрх хэсэг).
  /// Амжилттай гарсан эсвэл хэрэглэгч хаасан бол true; хуваалцах боломжгүй бол false.
  Future<bool> open(IcsExport export, {Rect? origin});
}

/// Файлын нэрийг аюулгүй болгоно: зам тусгаарлагчгүй, `.ics` өргөтгөлтэй.
String icsFileName(String filename) {
  final base = filename.trim().replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1f]'), '_');
  if (base.isEmpty || base == '.ics') return 'huvaari.ics';
  return base.toLowerCase().endsWith('.ics') ? base : '$base.ics';
}

/// Түр файл болгож бичээд системийн хуваалцах цонхоор (Хуанли, Google Calendar, Имэйл …) өгнө.
/// Түр хавтас систем өөрөө цэвэрлэнэ.
class ShareIcsOpener implements IcsOpener {
  const ShareIcsOpener();

  @override
  Future<bool> open(IcsExport export, {Rect? origin}) async {
    try {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/${icsFileName(export.filename)}');
      await file.writeAsString(export.ics, flush: true);
      final result = await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'text/calendar')],
          fileNameOverrides: [icsFileName(export.filename)],
          subject: 'Хичээлийн хуваарь',
          sharePositionOrigin: origin,
        ),
      );
      return result.status != ShareResultStatus.unavailable;
    } catch (_) {
      return false;
    }
  }
}

final icsOpenerProvider = Provider<IcsOpener>((ref) => const ShareIcsOpener());
