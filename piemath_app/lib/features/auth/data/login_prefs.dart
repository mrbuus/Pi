import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Нэвтрэх маягтын сонголт: сүүлд оруулсан нэвтрэх нэр (утас — хувийн мэдээлэл тул secure storage-д)
/// ба «Намайг сана» (өгөгдмөл ЧАГТТАЙ, вэбийн `components/auth/remember.ts`).
abstract class LoginPrefs {
  Future<String?> lastIdentifier();
  Future<bool> remember();
  Future<void> save({required String identifier, required bool remember});
}

class SecureLoginPrefs implements LoginPrefs {
  SecureLoginPrefs([FlutterSecureStorage? storage]) : _s = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _s;
  static const _kIdentifier = 'pm_login_identifier';
  static const _kRemember = 'pm_login_remember';

  @override
  Future<String?> lastIdentifier() async {
    try {
      return await _s.read(key: _kIdentifier);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<bool> remember() async {
    try {
      return (await _s.read(key: _kRemember)) != '0';
    } catch (_) {
      return true;
    }
  }

  @override
  Future<void> save({required String identifier, required bool remember}) async {
    try {
      await _s.write(key: _kIdentifier, value: identifier);
      await _s.write(key: _kRemember, value: remember ? '1' : '0');
    } catch (_) {
      // Хадгалж чадаагүй ч нэвтрэлтэд нөлөөгүй.
    }
  }
}

/// Тест болон түр орчинд.
class MemoryLoginPrefs implements LoginPrefs {
  MemoryLoginPrefs({this.identifier, this.rememberValue = true});

  String? identifier;
  bool rememberValue;

  @override
  Future<String?> lastIdentifier() async => identifier;

  @override
  Future<bool> remember() async => rememberValue;

  @override
  Future<void> save({required String identifier, required bool remember}) async {
    this.identifier = identifier;
    rememberValue = remember;
  }
}

final loginPrefsProvider = Provider<LoginPrefs>((ref) => SecureLoginPrefs());
