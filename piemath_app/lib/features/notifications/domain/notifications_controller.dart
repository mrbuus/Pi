import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/strings.dart';
import '../data/notification_models.dart';
import '../data/notifications_repository.dart';

/// Одоогийн цаг — «5 минутын өмнө» г.м. (тестэд override).
final notificationsNowProvider = Provider<DateTime Function()>((ref) => DateTime.now);

enum NotificationFilter { all, unread, read }

@immutable
class NotificationsState {
  const NotificationsState({
    required this.items,
    required this.nextCursor,
    required this.unread,
    this.filter = NotificationFilter.all,
    this.loadingMore = false,
    this.busyId,
    this.busyAll = false,
    this.actionError,
  });

  final List<AppNotification> items;
  final String? nextCursor;
  final int unread;
  final NotificationFilter filter;
  final bool loadingMore;

  /// «Уншсан болгох» хийгдэж буй мэдэгдэл.
  final String? busyId;
  final bool busyAll;

  /// Жагсаалтыг устгахгүй жижиг алдаа (дараагийн хуудас, уншсан болгох).
  final String? actionError;

  List<AppNotification> get visible => switch (filter) {
        NotificationFilter.all => items,
        NotificationFilter.unread => [for (final i in items) if (i.readAt == null) i],
        NotificationFilter.read => [for (final i in items) if (i.readAt != null) i],
      };

  NotificationsState copyWith({
    List<AppNotification>? items,
    String? nextCursor,
    bool clearCursor = false,
    int? unread,
    NotificationFilter? filter,
    bool? loadingMore,
    String? busyId,
    bool clearBusyId = false,
    bool? busyAll,
    String? actionError,
    bool clearActionError = false,
  }) {
    return NotificationsState(
      items: items ?? this.items,
      nextCursor: clearCursor ? null : (nextCursor ?? this.nextCursor),
      unread: unread ?? this.unread,
      filter: filter ?? this.filter,
      loadingMore: loadingMore ?? this.loadingMore,
      busyId: clearBusyId ? null : (busyId ?? this.busyId),
      busyAll: busyAll ?? this.busyAll,
      actionError: clearActionError ? null : (actionError ?? this.actionError),
    );
  }
}

/// Мэдэгдлийн жагсаалт (`/app/notifications`, вэбийн `notifications/page.tsx`).
final notificationsControllerProvider =
    AsyncNotifierProvider.autoDispose<NotificationsController, NotificationsState>(NotificationsController.new);

class NotificationsController extends AsyncNotifier<NotificationsState> {
  NotificationsRepository get _repo => ref.read(notificationsRepositoryProvider);

  @override
  Future<NotificationsState> build() async {
    final results = await Future.wait<Object>([_repo.page(), _repo.unreadCount()]);
    final page = results[0] as NotificationPage;
    return NotificationsState(items: page.notifications, nextCursor: page.nextCursor, unread: results[1] as int);
  }

  void setFilter(NotificationFilter f) {
    final s = state.value;
    if (s != null) state = AsyncData(s.copyWith(filter: f));
  }

  Future<void> loadMore() async {
    final s = state.value;
    if (s == null || s.nextCursor == null || s.loadingMore) return;
    state = AsyncData(s.copyWith(loadingMore: true, clearActionError: true));
    try {
      final page = await _repo.page(cursor: s.nextCursor);
      final now = state.value!;
      state = AsyncData(now.copyWith(
        items: [...now.items, ...page.notifications],
        nextCursor: page.nextCursor,
        clearCursor: page.nextCursor == null,
        loadingMore: false,
      ));
    } catch (e) {
      state = AsyncData(state.value!.copyWith(
        loadingMore: false,
        actionError: e is ApiError ? e.message : 'Дараагийн мэдэгдлүүдийг ачаалж чадсангүй.',
      ));
    }
  }

  Future<void> markRead(String id) async {
    final s = state.value;
    if (s == null || s.busyId != null || s.busyAll) return;
    final item = s.items.where((i) => i.id == id).firstOrNull;
    if (item == null || item.readAt != null) return;
    state = AsyncData(s.copyWith(busyId: id, clearActionError: true));
    try {
      await _repo.markRead(id);
      final now = state.value!;
      final stamp = DateTime.now().toUtc().toIso8601String();
      state = AsyncData(now.copyWith(
        items: [for (final i in now.items) i.id == id ? i.copyWith(readAt: stamp) : i],
        unread: now.unread > 0 ? now.unread - 1 : 0,
        clearBusyId: true,
      ));
      ref.invalidate(unreadNotificationsCountProvider);
    } catch (e) {
      state = AsyncData(state.value!.copyWith(
        clearBusyId: true,
        actionError: e is ApiError ? e.message : 'Мэдэгдлийг уншсан болгож чадсангүй.',
      ));
    }
  }

  Future<void> markAllRead() async {
    final s = state.value;
    if (s == null || s.busyAll || s.unread == 0) return;
    state = AsyncData(s.copyWith(busyAll: true, clearActionError: true));
    try {
      await _repo.markAllRead();
      final now = state.value!;
      final stamp = DateTime.now().toUtc().toIso8601String();
      state = AsyncData(now.copyWith(
        items: [for (final i in now.items) i.readAt == null ? i.copyWith(readAt: stamp) : i],
        unread: 0,
        busyAll: false,
      ));
      ref.invalidate(unreadNotificationsCountProvider);
    } catch (e) {
      state = AsyncData(state.value!.copyWith(
        busyAll: false,
        actionError: e is ApiError ? e.message : AppStrings.genericError,
      ));
    }
  }
}

/// Уншаагүй мэдэгдлийн тоо — хонх/badge-д (shell эзэн холбоно). Апп нээлттэй (resumed) үед
/// 60 секунд тутам асууна (вэбийн `NotificationBell`). Push (FCM) M6-д нэмэгдэнэ.
final unreadNotificationsCountProvider =
    AsyncNotifierProvider.autoDispose<UnreadNotificationsCount, int>(UnreadNotificationsCount.new);

class UnreadNotificationsCount extends AsyncNotifier<int> {
  static const interval = Duration(seconds: 60);

  @override
  Future<int> build() async {
    final timer = Timer.periodic(interval, (_) {
      final life = WidgetsBinding.instance.lifecycleState;
      if (life == null || life == AppLifecycleState.resumed) unawaited(_poll());
    });
    ref.onDispose(timer.cancel);
    return ref.read(notificationsRepositoryProvider).unreadCount();
  }

  Future<void> _poll() async {
    try {
      final n = await ref.read(notificationsRepositoryProvider).unreadCount();
      if (ref.mounted) state = AsyncData(n);
    } catch (_) {
      // Сүлжээгүй үед өмнөх тоо хэвээр.
    }
  }
}
