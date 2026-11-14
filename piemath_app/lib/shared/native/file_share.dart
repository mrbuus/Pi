import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';
import 'package:pdfx/pdfx.dart';
import 'package:share_plus/share_plus.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_error.dart';
import '../../core/network/network_providers.dart';
import '../../core/ui/ui.dart';

/// Системийн «Хуваалцах» цонх — тестэд солино.
abstract class ShareLauncher {
  /// Хуваалцах цонх гарсан (хэрэглэгч хаасан ч) бол `true`, боломжгүй бол `false`.
  Future<bool> shareFile(File file, {required String mimeType, String? subject, Rect? origin});
}

class SystemShareLauncher implements ShareLauncher {
  const SystemShareLauncher();

  @override
  Future<bool> shareFile(File file, {required String mimeType, String? subject, Rect? origin}) async {
    final name = file.uri.pathSegments.last;
    final result = await SharePlus.instance.share(
      ShareParams(
        files: [XFile(file.path, mimeType: mimeType)],
        fileNameOverrides: [name],
        subject: subject,
        sharePositionOrigin: origin,
      ),
    );
    return result.status != ShareResultStatus.unavailable;
  }
}

/// API-аас файл (Excel, PDF, CSV) эрхтэйгээр татаж түр хавтсанд хадгалаад «Хуваалцах» цонх эсвэл
/// PDF-ийг апп дотор харуулна (NATIVE-PLAN §3.6 — вэб холбоосгүй).
///
/// ```dart
/// final files = ref.read(fileShareProvider);
/// await files.share('/tuition/export', query: {'month': '2026-11'}, fileName: 'tolbor-11.xlsx');
/// await files.previewPdf(context, '/tests/$id/pdf', title: 'Тестийн хуудас');
/// ```
class FileShare {
  FileShare(this._client, {this.launcher = const SystemShareLauncher(), Future<Directory> Function()? tempDir})
    : _tempDir = tempDir ?? getTemporaryDirectory;

  final ApiClient _client;

  /// Системийн хуваалцах цонх (тестэд хуурамч).
  final ShareLauncher launcher;
  final Future<Directory> Function() _tempDir;

  static const _timeout = Duration(seconds: 90);

  /// Файл татаж түр хавтсанд бичнэ. [fileName] өгөөгүй бол серверийн `Content-Disposition`-оос.
  /// Алдаа бол [ApiError] (монгол мессежтэй).
  Future<File> download(String path, {Map<String, Object?>? query, String? fileName}) async {
    final dio = _client.dio;
    try {
      var res = await dio.get<List<int>>(
        path,
        queryParameters: query == null
            ? null
            : {
                for (final e in query.entries)
                  if (e.value != null) e.key: e.value,
              },
        options: Options(
          responseType: ResponseType.bytes,
          followRedirects: false,
          validateStatus: (_) => true,
          headers: _client.authHeaders(),
          receiveTimeout: _timeout,
        ),
      );
      var status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        // S3 presigned URL — Authorization толгойг ДАМЖУУЛАХГҮЙ (core/files/file_fetcher.dart-тай ижил).
        final location = res.headers.value('location');
        if (location == null || location.isEmpty) throw ApiError.fromStatus(502, null);
        final target = res.realUri.resolve(location);
        res = await dio.getUri<List<int>>(
          target,
          options: Options(
            responseType: ResponseType.bytes,
            followRedirects: true,
            validateStatus: (_) => true,
            receiveTimeout: _timeout,
          ),
        );
        status = res.statusCode ?? 0;
        if (status == 403) throw ApiError.fromStatus(503, null);
      }
      final data = res.data;
      if (status < 200 || status >= 300 || data == null) {
        throw ApiError.fromStatus(status, _jsonOrNull(data));
      }
      final name = safeFileName(
        fileName ?? fileNameFromDisposition(res.headers.value('content-disposition')) ?? 'file',
      );
      final base = await _tempDir();
      final dir = Directory('${base.path}/piemath_share');
      if (!dir.existsSync()) dir.createSync(recursive: true);
      final file = File('${dir.path}/$name');
      await file.writeAsBytes(data is Uint8List ? data : Uint8List.fromList(data), flush: true);
      return file;
    } on DioException catch (e) {
      throw ApiError.fromDio(e);
    } on FileSystemException {
      throw const ApiError(ApiErrorKind.unknown, 'Файлыг утсанд хадгалж чадсангүй');
    }
  }

  /// Татаад системийн «Хуваалцах» цонхыг нээнэ. Хуваалцах боломжгүй бол `false`.
  Future<bool> share(
    String path, {
    Map<String, Object?>? query,
    String? fileName,
    String? subject,
    Rect? origin,
  }) async {
    final file = await download(path, query: query, fileName: fileName);
    return launcher.shareFile(file, mimeType: mimeTypeOf(file.path), subject: subject, origin: origin);
  }

  /// PDF-ийг татаж апп дотор харуулна (дээд талд «Хуваалцах» товчтой).
  Future<void> previewPdf(
    BuildContext context,
    String path, {
    required String title,
    Map<String, Object?>? query,
    String? fileName,
  }) async {
    final file = await download(path, query: query, fileName: fileName ?? 'file.pdf');
    if (!context.mounted) return;
    await Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => PdfPreviewScreen(file: file, title: title, launcher: launcher),
      ),
    );
  }

  static Object? _jsonOrNull(List<int>? bytes) {
    if (bytes == null || bytes.isEmpty) return null;
    try {
      return jsonDecode(utf8.decode(bytes));
    } catch (_) {
      return null;
    }
  }

  /// `attachment; filename*=UTF-8''%D0%A2...` эсвэл `filename="x.xlsx"`.
  static String? fileNameFromDisposition(String? header) {
    if (header == null) return null;
    final star = RegExp(r"filename\*\s*=\s*(?:UTF-8'')?([^;]+)", caseSensitive: false).firstMatch(header);
    if (star != null) {
      try {
        return Uri.decodeComponent(star.group(1)!.trim().replaceAll('"', ''));
      } catch (_) {}
    }
    final plain = RegExp(r'filename\s*=\s*"?([^";]+)"?', caseSensitive: false).firstMatch(header);
    return plain?.group(1)?.trim();
  }

  /// Замын тусгаарлагч, хяналтын тэмдэгтгүй нэр.
  static String safeFileName(String name) {
    final s = name.trim().replaceAll(RegExp(r'[\\/:*?"<>|\x00-\x1f]'), '_');
    if (s.isEmpty || s == '.' || s == '..') return 'file';
    return s.length > 120 ? s.substring(s.length - 120) : s;
  }

  static String mimeTypeOf(String path) {
    final ext = path.toLowerCase().split('.').last;
    return switch (ext) {
      'pdf' => 'application/pdf',
      'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls' => 'application/vnd.ms-excel',
      'csv' => 'text/csv',
      'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'png' => 'image/png',
      'jpg' || 'jpeg' => 'image/jpeg',
      'ics' => 'text/calendar',
      'txt' => 'text/plain',
      _ => 'application/octet-stream',
    };
  }
}

final shareLauncherProvider = Provider<ShareLauncher>((ref) => const SystemShareLauncher());

final fileShareProvider = Provider<FileShare>(
  (ref) => FileShare(ref.watch(apiClientProvider), launcher: ref.watch(shareLauncherProvider)),
);

/// Татсан PDF-ийг харах (томруулж болно) + «Хуваалцах».
class PdfPreviewScreen extends StatefulWidget {
  const PdfPreviewScreen({super.key, required this.file, required this.title, required this.launcher});

  final File file;
  final String title;
  final ShareLauncher launcher;

  @override
  State<PdfPreviewScreen> createState() => _PdfPreviewScreenState();
}

class _PdfPreviewScreenState extends State<PdfPreviewScreen> {
  late final _controller = PdfControllerPinch(document: PdfDocument.openFile(widget.file.path));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _share(BuildContext buttonContext) async {
    final box = buttonContext.findRenderObject() as RenderBox?;
    final origin = box == null ? null : box.localToGlobal(Offset.zero) & box.size;
    final ok = await widget.launcher.shareFile(
      widget.file,
      mimeType: 'application/pdf',
      subject: widget.title,
      origin: origin,
    );
    if (!ok && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Энэ утсанд хуваалцах боломжгүй байна')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: const BackButton(),
        title: Text(widget.title),
        actions: [
          Builder(
            builder: (ctx) =>
                IconButton(tooltip: 'Хуваалцах', icon: const Icon(AppIcons.share), onPressed: () => _share(ctx)),
          ),
        ],
      ),
      body: PdfViewPinch(
        controller: _controller,
        builders: PdfViewPinchBuilders<DefaultBuilderOptions>(
          // Бүдгэрэх (opacity) шилжилтгүй — шууд солигдоно.
          options: const DefaultBuilderOptions(
            loaderSwitchDuration: Duration(milliseconds: 1),
            transitionBuilder: _noTransition,
          ),
          documentLoaderBuilder: (_) => const LoadingState(cards: 1),
          pageLoaderBuilder: (_) => const SizedBox.shrink(),
          errorBuilder: (_, _) => const ErrorState(message: 'Файлыг нээж чадсангүй'),
        ),
      ),
    );
  }
}

Widget _noTransition(Widget child, Animation<double> animation) => child;
