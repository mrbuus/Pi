import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'user_role.dart';

/// Хадгалсан нэвтрэлт.
class StoredAuth {
  const StoredAuth({required this.token, required this.userId, required this.role});

  final String token;
  final String userId;
  final UserRole role;
}

/// JWT хадгалах газар. Токен ЗӨВХӨН Keychain/Keystore-д (SECURITY §1) —
/// SharedPreferences, log, URL-д хэзээ ч биш.
abstract class TokenStore {
  Future<StoredAuth?> read();

  /// [persist] = «Намайг сана». false бол зөвхөн санах ойд (апп хаагдахад алга).
  Future<void> write(StoredAuth auth, {required bool persist});

  Future<void> clear();
}

class SecureTokenStore implements TokenStore {
  SecureTokenStore([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;
  StoredAuth? _memory;

  static const _kToken = 'pm_token';
  static const _kUser = 'pm_user';
  static const _kRole = 'pm_role';

  @override
  Future<StoredAuth?> read() async {
    if (_memory != null) return _memory;
    try {
      final token = await _storage.read(key: _kToken);
      final user = await _storage.read(key: _kUser);
      if (token == null || token.isEmpty || user == null) return null;
      return _memory = StoredAuth(
        token: token,
        userId: user,
        role: UserRole.fromApi(await _storage.read(key: _kRole)),
      );
    } catch (_) {
      // Keystore эвдэрсэн (Android-ийн зарим төхөөрөмж, backup сэргээлт) — дахин нэвтрүүлнэ.
      await clear();
      return null;
    }
  }

  @override
  Future<void> write(StoredAuth auth, {required bool persist}) async {
    _memory = auth;
    if (!persist) {
      await _deletePersisted();
      return;
    }
    await _storage.write(key: _kToken, value: auth.token);
    await _storage.write(key: _kUser, value: auth.userId);
    await _storage.write(key: _kRole, value: auth.role.apiValue);
  }

  @override
  Future<void> clear() async {
    _memory = null;
    await _deletePersisted();
  }

  Future<void> _deletePersisted() async {
    try {
      await _storage.delete(key: _kToken);
      await _storage.delete(key: _kUser);
      await _storage.delete(key: _kRole);
    } catch (_) {
      // Устгаж чадаагүй ч санах ойгоос аль хэдийн цэвэрлэсэн.
    }
  }
}

/// Тест болон түр орчинд.
class MemoryTokenStore implements TokenStore {
  MemoryTokenStore([this._auth]);

  StoredAuth? _auth;
  bool? lastPersist;

  @override
  Future<StoredAuth?> read() async => _auth;

  @override
  Future<void> write(StoredAuth auth, {required bool persist}) async {
    _auth = auth;
    lastPersist = persist;
  }

  @override
  Future<void> clear() async => _auth = null;
}
