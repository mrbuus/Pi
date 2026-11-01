import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/network_providers.dart';
import 'notification_models.dart';

Map<String, Object?> _map(Object? j) => (j! as Map).cast<String, Object?>();

class NotificationsRepository {
  const NotificationsRepository(this._api);

  final ApiClient _api;

  static const pageSize = 20;

  Future<NotificationPage> page({String? cursor}) => _api.get(
        '/notifications/my',
        query: {'limit': pageSize, 'cursor': cursor},
        parse: (j) => NotificationPage.fromJson(_map(j)),
      );

  Future<int> unreadCount() => _api.get(
        '/notifications/my/unread-count',
        parse: (j) => (_map(j)['count'] as num?)?.toInt() ?? 0,
      );

  Future<void> markRead(String id) =>
      _api.post<Object?>('/notifications/${Uri.encodeComponent(id)}/read', retry: true);

  Future<void> markAllRead() => _api.post<Object?>('/notifications/read-all', retry: true);

  Future<NotificationSettings> settings() =>
      _api.get('/notifications/settings', parse: (j) => NotificationSettings.fromJson(_map(j)));

  Future<NotificationSettings> saveSettings(NotificationSettings s) => _api.patch(
        '/notifications/settings',
        body: {'emailWeekly': s.emailWeekly, 'emailReminders': s.emailReminders},
        parse: (j) => NotificationSettings.fromJson(_map(j)),
        retry: true,
      );
}

final notificationsRepositoryProvider = Provider<NotificationsRepository>(
  (ref) => NotificationsRepository(ref.watch(apiClientProvider)),
);
