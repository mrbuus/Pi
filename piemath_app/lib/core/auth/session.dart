import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_error.dart';
import '../network/network_providers.dart';
import 'current_user.dart';
import 'token_holder.dart';
import 'token_store.dart';
import 'user_role.dart';

/// Нэвтрэлтийн төлөв.
sealed class SessionState {
  const SessionState();
}

/// Апп асахад хадгалсан токеныг уншиж байна (splash).
final class SessionRestoring extends SessionState {
  const SessionRestoring();
}

/// Нэвтрээгүй. [message] — яагаад гарсан (жишээ: «Нууц үг өөрчлөгдсөн тул дахин нэвтэрнэ үү»).
final class SignedOut extends SessionState {
  const SignedOut([this.message]);

  final String? message;
}

/// Нэвтэрсэн. [user] нь `/auth/me` ачаалагдаагүй (офлайнаар эхэлсэн) үед null —
/// тэр үед ч [role]-оор зөв бүрхүүл харуулна.
final class SignedIn extends SessionState {
  const SignedIn(this.auth, [this.user]);

  final StoredAuth auth;
  final CurrentUser? user;

  UserRole get role => user?.role ?? auth.role;
}

final tokenHolderProvider = Provider<TokenHolder>((ref) => TokenHolder());

final tokenStoreProvider = Provider<TokenStore>((ref) => SecureTokenStore());

/// Гарах/хугацаа дуусах үед ажиллах цэвэрлэгээ (жишээ: шалгалтын офлайн ноорог).
/// core нь feature-ийг импортлохгүйн тулд app/bootstrap-д override хийнэ (SECURITY §3).
final signOutCleanupsProvider = Provider<List<Future<void> Function()>>((ref) => const []);

final sessionProvider = NotifierProvider<SessionController, SessionState>(SessionController.new);

class SessionController extends Notifier<SessionState> {
  bool _persist = true;

  TokenStore get _store => ref.read(tokenStoreProvider);
  TokenHolder get _holder => ref.read(tokenHolderProvider);

  @override
  SessionState build() => const SessionRestoring();

  /// Апп асахад нэг удаа (bootstrap).
  Future<void> restore() async {
    final auth = await _store.read();
    if (auth == null) {
      state = const SignedOut();
      return;
    }
    _persist = true;
    _holder.set(auth.token);
    state = SignedIn(auth);
    await refreshUser();
  }

  /// Нэвтрэх амжилттай болсны дараа (M1 нэвтрэх дэлгэц).
  Future<void> signIn({
    required String token,
    required String userId,
    required UserRole role,
    required bool remember,
  }) async {
    final auth = StoredAuth(token: token, userId: userId, role: role);
    _persist = remember;
    await _store.write(auth, persist: remember);
    _holder.set(token);
    state = SignedIn(auth);
    await refreshUser();
  }

  /// Нууц үг сольсны дараа сервер шинэ токен өгнө (хуучин нь хүчингүй болсон).
  Future<void> replaceToken(String token) async {
    final current = state;
    if (current is! SignedIn) return;
    final auth = StoredAuth(token: token, userId: current.auth.userId, role: current.auth.role);
    await _store.write(auth, persist: _persist);
    _holder.set(token);
    state = SignedIn(auth, current.user);
  }

  /// `/auth/me`-г дахин ачаална. Сүлжээгүй бол одоогийн төлөв хэвээр (офлайн).
  Future<void> refreshUser() async {
    final current = state;
    if (current is! SignedIn) return;
    try {
      final user = await ref.read(apiClientProvider).get('/auth/me', parse: _parseUser);
      final now = state;
      if (now is SignedIn && now.auth.token == current.auth.token) state = SignedIn(now.auth, user);
    } on ApiError catch (e) {
      // 401 бол apiClient-ийн onUnauthorized → expire() аль хэдийн дуудагдсан.
      if (e.kind == ApiErrorKind.unauthorized || e.isNetwork) return;
      rethrow;
    }
  }

  /// Сервер токеныг хүлээж аваагүй (401) — хадгалсныг устгаж нэвтрэх рүү.
  Future<void> expire(String message) async {
    if (state is! SignedIn) return;
    await _clear();
    state = SignedOut(message);
  }

  /// Хэрэглэгч өөрөө гарах. Токен, кэш бүгд устна (SECURITY §3).
  Future<void> signOut() async {
    await _clear();
    state = const SignedOut();
  }

  Future<void> _clear() async {
    _holder.set(null);
    await _store.clear();
    for (final cleanup in ref.read(signOutCleanupsProvider)) {
      try {
        await cleanup();
      } on Object {
        // Цэвэрлэгээ бүтэлгүйтсэн ч гаралт заавал дуусна.
      }
    }
  }

  static CurrentUser _parseUser(Object? json) => CurrentUser.fromJson((json! as Map).cast<String, Object?>());
}
