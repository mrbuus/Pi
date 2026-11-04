import 'package:freezed_annotation/freezed_annotation.dart';

part 'notification_models.freezed.dart';
part 'notification_models.g.dart';

/// `GET /notifications/my` мөр. Гэрээ: `docs/api-contract/notifications-payments-misc.md`.
@freezed
abstract class AppNotification with _$AppNotification {
  const factory AppNotification({
    required String id,

    /// PAYMENT_DUE | HOMEWORK | SCHEDULE_CHANGE | ANNOUNCEMENT | SYSTEM
    @Default('SYSTEM') String kind,
    required String title,
    String? body,

    /// Вэбийн дотоод зам (`/app/homework`, `/app/tests/<id>`) — апп ижил замтай.
    String? link,
    String? readAt,
    required String createdAt,
  }) = _AppNotification;

  factory AppNotification.fromJson(Map<String, Object?> json) => _$AppNotificationFromJson(json);
}

@freezed
abstract class NotificationPage with _$NotificationPage {
  const factory NotificationPage({
    @Default(<AppNotification>[]) List<AppNotification> notifications,
    String? nextCursor,
  }) = _NotificationPage;

  factory NotificationPage.fromJson(Map<String, Object?> json) => _$NotificationPageFromJson(json);
}

/// `GET/PATCH /notifications/settings` — ИМЭЙЛИЙН тохиргоо (апп доторх мэдэгдэлд нөлөөгүй).
@freezed
abstract class NotificationSettings with _$NotificationSettings {
  const factory NotificationSettings({
    @Default(true) bool emailWeekly,
    @Default(true) bool emailReminders,
  }) = _NotificationSettings;

  factory NotificationSettings.fromJson(Map<String, Object?> json) => _$NotificationSettingsFromJson(json);
}
