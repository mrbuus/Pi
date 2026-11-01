import 'package:freezed_annotation/freezed_annotation.dart';

import '../format/person_name.dart';
import 'user_role.dart';

part 'current_user.freezed.dart';
part 'current_user.g.dart';

/// `GET /auth/me` — нэвтэрсэн хэрэглэгч (`api/src/auth/auth.service.ts` `me()` select).
/// Профайлын дэлгэрэнгүй бүтэц: `docs/api-contract/auth.md`.
@freezed
abstract class CurrentUser with _$CurrentUser {
  const CurrentUser._();

  const factory CurrentUser({
    required String id,
    @JsonKey(unknownEnumValue: UserRole.unknown) required UserRole role,
    @Default('') String firstName,
    String? lastName,
    String? phone,
    String? email,
    String? username,
    String? studentCode,
    String? teacherCode,
    String? avatarUrl,
    @Default(false) bool mustChangePassword,

    /// Сурагчийн профайл (анги, `type`: ONLINE / IN_PERSON …) — M1-д бүрэн загвар.
    Map<String, Object?>? studentProfile,
    Map<String, Object?>? teacherProfile,
    Map<String, Object?>? externalTeacherProfile,
  }) = _CurrentUser;

  factory CurrentUser.fromJson(Map<String, Object?> json) => _$CurrentUserFromJson(json);

  /// «Б. Нараа», Багш+ бол «Б. Нараа+».
  String get displayName => staffName(firstName: firstName, lastName: lastName, role: role.apiValue);

  /// Онлайн ангийн сурагч эсэх (гэрийн даалгаврын загвар сонгоход, STATUS §7.11).
  bool get isOnlineStudent => studentProfile?['type'] == 'ONLINE';
}
