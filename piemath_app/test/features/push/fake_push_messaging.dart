import 'dart:async';

import 'package:piemath_app/features/push/push_messaging.dart';

/// `firebase_messaging`-ийн хуурамч хувилбар.
class FakePushMessaging implements PushMessaging {
  FakePushMessaging({this.enabled = true, this.token = 'fcm:tok/1', this.initOk = true});

  @override
  bool enabled;
  String? token;
  bool initOk;

  int initCalls = 0;
  int permissionCalls = 0;
  int deleteCalls = 0;
  // Тест дуусахад GC цэвэрлэнэ.
  // ignore: close_sinks
  final refresh = StreamController<String>.broadcast();
  // ignore: close_sinks
  final messages = StreamController<PushMessage>.broadcast();

  @override
  Future<bool> init() async {
    initCalls++;
    return initOk;
  }

  @override
  Future<bool> requestPermission() async {
    permissionCalls++;
    return true;
  }

  @override
  Future<String?> getToken() async => token;

  @override
  Stream<String> get onTokenRefresh => refresh.stream;

  @override
  Stream<PushMessage> get onForegroundMessage => messages.stream;

  @override
  Future<void> deleteToken() async => deleteCalls++;
}
