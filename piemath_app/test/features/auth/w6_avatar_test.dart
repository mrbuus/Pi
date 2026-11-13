import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/files/files.dart';
import 'package:piemath_app/features/auth/data/avatar_image.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'auth_test_helpers.dart';

// Давалгаа 6 (вэб 2026-11-12): профайл зургийг 512px дөрвөлжин JPEG болгож илгээнэ.

class _Photos implements PhotoSource {
  @override
  Future<PhotoPage?> takePhoto() async => PhotoPage(Uint8List.fromList([0xFF, 0xD8, 1, 2]), name: 'IMG.heic');

  @override
  Future<List<PhotoPage>> pickFromGallery({required int limit}) async => [await takePhoto() as PhotoPage];
}

class _Avatar implements AvatarProcessor {
  final calls = <Uint8List>[];

  @override
  Future<Uint8List> prepare(Uint8List bytes) async {
    calls.add(bytes);
    return Uint8List.fromList([0xFF, 0xD8, 9, 9, 9]);
  }
}

void main() {
  test('төвөөс дөрвөлжин тайрах, 512-оос томруулахгүй', () {
    expect(avatarCrop(4000, 3000), (left: 500.0, top: 0.0, side: 3000.0, out: 512));
    expect(avatarCrop(300, 600), (left: 0.0, top: 150.0, side: 300.0, out: 300));
    expect(avatarCrop(512, 512).out, 512);
  });

  test('зургийн толгой: JPEG, PNG, HEIC таних; бусад байтыг шахагч руу явуулахгүй', () async {
    Uint8List b(List<int> head) => Uint8List.fromList([...head, ...List.filled(12, 0)]);
    expect(looksLikeImage(b([0xFF, 0xD8])), isTrue);
    expect(looksLikeImage(b([0x89, 0x50, 0x4E, 0x47])), isTrue);
    expect(looksLikeImage(b([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])), isTrue);
    expect(looksLikeImage(b([1, 2, 3])), isFalse);
    final junk = Uint8List.fromList([1, 2, 3]);
    expect(await const NativeAvatarProcessor().prepare(junk), same(junk));
  });

  testWidgets('профайл зураг: бэлдсэн (512px JPEG) байтыг /uploads руу илгээнэ', (tester) async {
    final avatar = _Avatar();
    final http = FakeHttp()
      ..json('GET', '/auth/me', fakeMe())
      ..json('POST', '/uploads/presign', {'direct': false})
      ..json('POST', '/uploads', {'key': 'uploads/a1.jpg', 'size': 5, 'mime': 'image/jpeg'})
      ..json('POST', '/auth/me/avatar', {'avatarUrl': 'uploads/a1.jpg'});
    await pumpAuthApp(
      tester,
      http: http,
      auth: signedInStudent,
      location: '/app/profile',
      overrides: [
        photoSourceProvider.overrideWithValue(_Photos()),
        avatarProcessorProvider.overrideWithValue(avatar),
      ],
    );
    await tester.tap(find.text('Зураг нэмэх'));
    await settle(tester);
    await tester.tap(find.text('Галерейгаас сонгох'));
    await settle(tester);
    expect(avatar.calls.single, [0xFF, 0xD8, 1, 2]);
    expect(http.requests.where((r) => r.path == '/auth/me/avatar').single.data, {'key': 'uploads/a1.jpg'});
  });
}
