import 'dart:async';

import 'package:flutter/widgets.dart';

import 'integrity_event.dart';

/// Шалгалтын хамгаалалт (EXAM-INTEGRITY.md §2).
///
/// Ашиглах дүрэм: шалгалт эхлэхэд [enter], илгээсэн / гарсан / алдаа / хугацаа дууссан
/// БҮХ замд [exit] (`finally`, `dispose`). Шалгалт дууссаны дараа скриншот хориотой
/// хэвээр үлдэх ёсгүй. [exit] нь давтан дуудахад аюулгүй (idempotent).
abstract class ExamGuard {
  /// Хамгаалалт асаах: Android `FLAG_SECURE`, iOS скриншот, бичлэг ажиглах, апп-ын
  /// амьдралын мөчлөг (lifecycle) ажиглах.
  Future<void> enter();

  /// Хамгаалалт унтраах. Идэвхгүй үед дуудвал юу ч хийхгүй.
  Future<void> exit();

  /// Идэвхтэй эсэх.
  bool get isActive;

  /// Үйл явдлын урсгал (broadcast). [enter]-ээс [exit] хүртэл л үйл явдал ирнэ.
  Stream<IntegrityEvent> get events;
}

/// `AppLifecycleState` → [IntegrityEventType] хөрвүүлэгч (цэвэр логик).
///
/// - `hidden`, `paused` → [IntegrityEventType.backgrounded] (дараалан ирвэл НЭГ л удаа).
/// - `resumed` → [IntegrityEventType.resumed] (зөвхөн өмнө нь арын дэвсгэрт байсан бол).
/// - `inactive` (утасны дуудлага, Control Center, системийн диалог) — «гарсан» БИШ.
/// - `detached` — юу ч биш.
class LifecycleEventMapper {
  bool _away = false;

  /// Одоо арын дэвсгэрт байгаа эсэх.
  bool get isAway => _away;

  IntegrityEventType? map(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.hidden:
      case AppLifecycleState.paused:
        if (_away) return null;
        _away = true;
        return IntegrityEventType.backgrounded;
      case AppLifecycleState.resumed:
        if (!_away) return null;
        _away = false;
        return IntegrityEventType.resumed;
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
        return null;
    }
  }

  void reset() => _away = false;
}

/// Тест болон платформын хэрэгжүүлэлтгүй орчинд зориулсан хуурамч хамгаалалт.
class FakeExamGuard implements ExamGuard {
  FakeExamGuard({DateTime Function()? now}) : _now = now ?? DateTime.now;

  final DateTime Function() _now;
  final _controller = StreamController<IntegrityEvent>.broadcast(sync: true);
  bool _active = false;

  /// [enter] хэдэн удаа дуудагдсан.
  int enterCalls = 0;

  /// Идэвхтэй үеийн (жинхэнэ) [exit] хэдэн удаа.
  int exitCalls = 0;

  @override
  bool get isActive => _active;

  @override
  Stream<IntegrityEvent> get events => _controller.stream;

  @override
  Future<void> enter() async {
    enterCalls++;
    _active = true;
  }

  @override
  Future<void> exit() async {
    if (!_active) return;
    exitCalls++;
    _active = false;
  }

  /// Тестээс үйл явдал үүсгэх. Идэвхгүй үед тоохгүй (жинхэнэ хамгаалалттай адил).
  void emit(IntegrityEventType type, {DateTime? at}) {
    if (!_active) return;
    _controller.add(IntegrityEvent(type, at ?? _now()));
  }

  Future<void> dispose() => _controller.close();
}
