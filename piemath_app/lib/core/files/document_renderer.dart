import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pdfx/pdfx.dart';

/// Олон хуудастай баримтыг (гэрийн даалгавар, онолын зураг) хуудас бүрээр нь зураг болгоно.
/// Натив (Android PdfRenderer, iOS PDFKit) — тестэд хуурамчаар солино.
abstract class DocumentRenderer {
  /// Хуудас бүрийг [width] пикселийн өргөнтэй JPEG болгоно.
  Future<List<Uint8List>> renderPages(Uint8List document, {required int width});
}

class NativeDocumentRenderer implements DocumentRenderer {
  const NativeDocumentRenderer();

  @override
  Future<List<Uint8List>> renderPages(Uint8List document, {required int width}) async {
    final doc = await PdfDocument.openData(document);
    try {
      final out = <Uint8List>[];
      for (var i = 1; i <= doc.pagesCount; i++) {
        final page = await doc.getPage(i);
        try {
          final w = width.toDouble();
          final h = w * page.height / page.width;
          final image = await page.render(width: w, height: h, format: PdfPageImageFormat.jpeg, quality: 85, backgroundColor: '#FFFFFF');
          if (image != null) out.add(image.bytes);
        } finally {
          await page.close();
        }
      }
      return out;
    } finally {
      await doc.close();
    }
  }
}

final documentRendererProvider = Provider<DocumentRenderer>((ref) => const NativeDocumentRenderer());
