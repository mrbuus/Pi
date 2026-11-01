// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'notification_models.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_AppNotification _$AppNotificationFromJson(Map<String, dynamic> json) =>
    _AppNotification(
      id: json['id'] as String,
      kind: json['kind'] as String? ?? 'SYSTEM',
      title: json['title'] as String,
      body: json['body'] as String?,
      link: json['link'] as String?,
      readAt: json['readAt'] as String?,
      createdAt: json['createdAt'] as String,
    );

Map<String, dynamic> _$AppNotificationToJson(_AppNotification instance) =>
    <String, dynamic>{
      'id': instance.id,
      'kind': instance.kind,
      'title': instance.title,
      'body': instance.body,
      'link': instance.link,
      'readAt': instance.readAt,
      'createdAt': instance.createdAt,
    };

_NotificationPage _$NotificationPageFromJson(Map<String, dynamic> json) =>
    _NotificationPage(
      notifications:
          (json['notifications'] as List<dynamic>?)
              ?.map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const <AppNotification>[],
      nextCursor: json['nextCursor'] as String?,
    );

Map<String, dynamic> _$NotificationPageToJson(_NotificationPage instance) =>
    <String, dynamic>{
      'notifications': instance.notifications,
      'nextCursor': instance.nextCursor,
    };

_NotificationSettings _$NotificationSettingsFromJson(
  Map<String, dynamic> json,
) => _NotificationSettings(
  emailWeekly: json['emailWeekly'] as bool? ?? true,
  emailReminders: json['emailReminders'] as bool? ?? true,
);

Map<String, dynamic> _$NotificationSettingsToJson(
  _NotificationSettings instance,
) => <String, dynamic>{
  'emailWeekly': instance.emailWeekly,
  'emailReminders': instance.emailReminders,
};
