import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:url_launcher/url_launcher.dart';

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

/// `.ics` файлыг утасны хуанли руу нээх үйлдэл. Тестэд солино.
abstract class IcsOpener {
  Future<bool> open(String ics);
}

/// Түр файл болгож бичээд системд нээлгэнэ (хуанлийн апп хүлээж авна). Түр хавтас систем өөрөө цэвэрлэнэ.
class SystemIcsOpener implements IcsOpener {
  const SystemIcsOpener();

  @override
  Future<bool> open(String ics) async {
    try {
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/huvaari.ics');
      await file.writeAsString(ics, flush: true);
      return await launchUrl(Uri.file(file.path), mode: LaunchMode.externalApplication);
    } catch (_) {
      return false;
    }
  }
}

final icsOpenerProvider = Provider<IcsOpener>((ref) => const SystemIcsOpener());
