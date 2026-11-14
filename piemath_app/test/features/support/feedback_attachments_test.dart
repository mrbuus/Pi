import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/files/file_uploader.dart';
import 'package:piemath_app/core/files/photo_document.dart';
import 'package:piemath_app/core/files/photo_source.dart';
import 'package:piemath_app/core/network/api_error.dart';
import 'package:piemath_app/features/support/ui/feedback_attachments.dart';
import 'package:piemath_app/features/support/ui/feedback_screen.dart';

import '../../helpers/fake_http.dart';
import '../m7_harness.dart';

/// 1x1 PNG.
final _png = base64Decode(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
);

class _FakePhotos implements PhotoSource {
  _FakePhotos(this.gallery);

  final List<PhotoPage> gallery;
  PhotoPage? camera;

  @override
  Future<PhotoPage?> takePhoto() async => camera;

  @override
  Future<List<PhotoPage>> pickFromGallery({required int limit}) async => gallery.take(limit).toList();
}

class _FakeUploader implements FileUploader {
  final uploads = <({String name, String mime, UploadPurpose purpose})>[];
  final failFirst = <String>{};
  var _n = 0;

  @override
  Future<UploadedFile> upload({
    required Uint8List bytes,
    required String name,
    required String mime,
    required UploadPurpose purpose,
    int? pages,
    void Function(double progress)? onProgress,
    CancelToken? cancel,
  }) async {
    uploads.add((name: name, mime: mime, purpose: purpose));
    if (failFirst.remove(name)) throw const ApiError(ApiErrorKind.server, 'Файл байршуулахад алдаа гарлаа.');
    return UploadedFile(key: 'k${++_n}', size: bytes.length, mime: mime);
  }
}

final _sentTicket = {
  'id': 'f1',
  'kind': 'BUG',
  'subject': 'Зураг харагдахгүй',
  'body': 'Шалгалтын дүн нээгдэхгүй байна',
  'state': 'OPEN',
  'response': null,
  'createdAt': '2026-11-04T02:00:00.000Z',
};

void main() {
  test('imageUploadMeta: зөвхөн JPG/PNG/GIF/WEBP, бусдыг JPEG болгоно', () {
    expect(imageUploadMeta('a.PNG'), (name: 'a.PNG', mime: 'image/png'));
    expect(imageUploadMeta('b.webp').mime, 'image/webp');
    expect(imageUploadMeta('c.heic'), (name: 'zurag.jpg', mime: 'image/jpeg'));
    expect(imageUploadMeta('noext'), (name: 'zurag.jpg', mime: 'image/jpeg'));
  });

  group('FeedbackAttachmentsController', () {
    test('3 хүртэл, амжилттай түлхүүрүүд давхардалгүй', () async {
      final up = _FakeUploader();
      final c = FeedbackAttachmentsController(up);
      c.addAll([for (var i = 0; i < 5; i++) PhotoPage(_png, name: 'p$i.jpg')]);
      expect(c.items, hasLength(3));
      expect(c.canAdd, isFalse);
      await Future<void>.delayed(Duration.zero);
      expect(c.uploading, isFalse);
      expect(c.keys, ['k1', 'k2', 'k3']);
      expect(up.uploads.every((u) => u.purpose == UploadPurpose.general), isTrue);
      c.dispose();
    });

    test('алдаа → failed, retry → done, remove', () async {
      final up = _FakeUploader()..failFirst.add('a.jpg');
      final c = FeedbackAttachmentsController(up)..addAll([PhotoPage(_png, name: 'a.jpg')]);
      await Future<void>.delayed(Duration.zero);
      expect(c.hasFailed, isTrue);
      expect(c.keys, isEmpty);
      c.retry(c.items.first);
      await Future<void>.delayed(Duration.zero);
      expect(c.hasFailed, isFalse);
      expect(c.keys, ['k1']);
      c.remove(c.items.first);
      expect(c.items, isEmpty);
      c.dispose();
    });
  });

  testWidgets('зураг сонгоод илгээх → attachmentKeys; амжилтын дараа цэвэрлэнэ', (tester) async {
    final up = _FakeUploader();
    final photos = _FakePhotos([PhotoPage(_png, name: 'a.jpg'), PhotoPage(_png, name: 'b.png')]);
    final http = FakeHttp()
      ..json('GET', '/feedback', <Object?>[])
      ..json('POST', '/feedback', _sentTicket);
    await pumpM7(
      tester,
      const FeedbackScreen(),
      http: http,
      extra: [fileUploaderProvider.overrideWithValue(up), photoSourceProvider.overrideWithValue(photos)],
    );
    expect(find.text('Зураг хавсаргах (0/3)'), findsOneWidget);
    await tester.enterText(find.byType(TextFormField).first, 'Зураг харагдахгүй');
    await tester.enterText(find.byType(TextFormField).last, 'Шалгалтын дүн нээгдэхгүй байна');
    await tester.tap(find.text('Галерей'));
    await settle(tester);
    expect(find.text('Зураг хавсаргах (2/3)'), findsOneWidget);
    expect(find.text('Хавсарсан'), findsNWidgets(2));
    await tester.ensureVisible(find.text('Хүсэлт илгээх'));
    await tester.tap(find.text('Хүсэлт илгээх'));
    await settle(tester);
    final post = http.requests.singleWhere((r) => r.method == 'POST' && r.path == '/feedback');
    expect((post.data as Map)['attachmentKeys'], ['k1', 'k2']);
    expect(find.text('Зураг хавсаргах (0/3)'), findsOneWidget);
    await tester.pumpAndSettle();
  });

  testWidgets('байршуулж дуустал / алдаатай үед илгээхгүй; хасаад илгээнэ', (tester) async {
    final up = _FakeUploader()..failFirst.add('a.jpg');
    final photos = _FakePhotos([PhotoPage(_png, name: 'a.jpg')]);
    final http = FakeHttp()
      ..json('GET', '/feedback', <Object?>[])
      ..json('POST', '/feedback', _sentTicket);
    await pumpM7(
      tester,
      const FeedbackScreen(),
      http: http,
      extra: [fileUploaderProvider.overrideWithValue(up), photoSourceProvider.overrideWithValue(photos)],
    );
    await tester.enterText(find.byType(TextFormField).first, 'Зураг харагдахгүй');
    await tester.enterText(find.byType(TextFormField).last, 'Шалгалтын дүн нээгдэхгүй байна');
    await tester.tap(find.text('Галерей'));
    await settle(tester);
    expect(find.text('Файл байршуулахад алдаа гарлаа.'), findsOneWidget);
    await tester.ensureVisible(find.text('Хүсэлт илгээх'));
    await tester.tap(find.text('Хүсэлт илгээх'));
    await settle(tester);
    expect(find.text('Илгээгдээгүй зураг байна. Дахин оролдох эсвэл хасна уу.'), findsOneWidget);
    expect(http.requests.where((r) => r.method == 'POST'), isEmpty);

    await tester.tap(find.byTooltip('Зураг хасах'));
    await settle(tester);
    await tester.ensureVisible(find.text('Хүсэлт илгээх'));
    await tester.tap(find.text('Хүсэлт илгээх'));
    await settle(tester);
    final post = http.requests.singleWhere((r) => r.method == 'POST');
    expect((post.data as Map).containsKey('attachmentKeys'), isFalse);
    await tester.pumpAndSettle();
  });

  testWidgets('камер/галерей зөвшөөрөлгүй → тайван мессеж', (tester) async {
    final photos = _ThrowingPhotos();
    final http = FakeHttp()..json('GET', '/feedback', <Object?>[]);
    await pumpM7(
      tester,
      const FeedbackScreen(),
      http: http,
      extra: [photoSourceProvider.overrideWithValue(photos)],
    );
    await tester.tap(find.text('Камер'));
    await settle(tester);
    expect(find.textContaining('зөвшөөрлөө шалгана уу'), findsOneWidget);
  });
}

class _ThrowingPhotos implements PhotoSource {
  @override
  Future<PhotoPage?> takePhoto() async => throw StateError('denied');

  @override
  Future<List<PhotoPage>> pickFromGallery({required int limit}) async => throw StateError('denied');
}
