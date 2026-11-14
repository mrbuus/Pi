import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/files/files.dart';

import '../../helpers/fake_http.dart';
import '../../helpers/test_container.dart';
import 'auth_test_helpers.dart';

class _FakePhotos implements PhotoSource {
  _FakePhotos({this.empty = false});

  final bool empty;
  int camera = 0;
  int gallery = 0;

  @override
  Future<PhotoPage?> takePhoto() async {
    camera++;
    return empty ? null : PhotoPage(Uint8List.fromList([1, 2, 3]), name: 'IMG.heic');
  }

  @override
  Future<List<PhotoPage>> pickFromGallery({required int limit}) async {
    gallery++;
    return empty
        ? const []
        : [
            PhotoPage(Uint8List.fromList([1, 2, 3]), name: 'IMG.heic'),
          ];
  }
}

FakeHttp _http({String? firstAvatar, bool uploadFails = false}) {
  var meCalls = 0;
  return FakeHttp()
    ..on(
      'GET',
      '/auth/me',
      (_) => FakeResponse({...fakeMe(), 'avatarUrl': ++meCalls == 1 ? firstAvatar : 'uploads/a1.jpg'}),
    )
    ..json('POST', '/uploads/presign', {'direct': false})
    ..on(
      'POST',
      '/uploads',
      (_) => uploadFails
          ? const FakeResponse({'statusCode': 400, 'message': 'Зураг хэт том байна'}, status: 400)
          : const FakeResponse({'key': 'uploads/a1.jpg', 'size': 3, 'mime': 'image/jpeg'}),
    )
    ..json('POST', '/auth/me/avatar', {'avatarUrl': 'uploads/a1.jpg'});
}

void main() {
  testWidgets('профайл зураг нэмэх: галерей → /uploads → /auth/me/avatar {key} → профайл шинэчлэгдэнэ', (tester) async {
    final http = _http();
    final photos = _FakePhotos();
    await pumpAuthApp(
      tester,
      http: http,
      auth: signedInStudent,
      location: '/app/profile',
      overrides: [photoSourceProvider.overrideWithValue(photos)],
    );
    expect(find.text('Зураг нэмэх'), findsOneWidget);
    expect(photos.gallery + photos.camera, 0, reason: 'зөвхөн товшоход зөвшөөрөл/сонгогч');
    await tester.tap(find.text('Зураг нэмэх'));
    await settle(tester);
    expect(find.text('Камераар авах'), findsOneWidget);
    await tester.tap(find.text('Галерейгаас сонгох'));
    await settle(tester);
    expect(photos.gallery, 1);
    final avatarCall = http.requests.firstWhere((r) => r.path == '/auth/me/avatar');
    expect(avatarCall.data, {'key': 'uploads/a1.jpg'});
    expect(http.count('GET', '/auth/me'), greaterThanOrEqualTo(2));
    expect(find.text('Зураг солих'), findsOneWidget);
  });

  testWidgets('камераас болиулбал юу ч илгээгдэхгүй', (tester) async {
    final http = _http(firstAvatar: 'uploads/old.jpg');
    final photos = _FakePhotos(empty: true);
    await pumpAuthApp(
      tester,
      http: http,
      auth: signedInStudent,
      location: '/app/profile',
      overrides: [photoSourceProvider.overrideWithValue(photos)],
    );
    expect(find.text('Зураг солих'), findsOneWidget);
    await tester.tap(find.text('Зураг солих'));
    await settle(tester);
    await tester.tap(find.text('Камераар авах'));
    await settle(tester);
    expect(photos.camera, 1);
    expect(http.count('POST', '/auth/me/avatar'), 0);
    expect(http.count('POST', '/uploads'), 0);
  });

  testWidgets('байршуулалт амжилтгүй: монгол алдаа, хуучин зураг хэвээр', (tester) async {
    final http = _http(firstAvatar: 'uploads/old.jpg', uploadFails: true);
    await pumpAuthApp(
      tester,
      http: http,
      auth: signedInStudent,
      location: '/app/profile',
      overrides: [photoSourceProvider.overrideWithValue(_FakePhotos())],
    );
    await tester.tap(find.text('Зураг солих'));
    await settle(tester);
    await tester.tap(find.text('Галерейгаас сонгох'));
    await settle(tester);
    expect(find.text('Зураг хэт том байна'), findsOneWidget);
    expect(http.count('POST', '/auth/me/avatar'), 0);
  });
}
