import 'package:flutter/foundation.dart';

/// Шалгалтын үеийн бүрэн бүтэн байдлын үйл явдлын төрөл (EXAM-INTEGRITY.md §2).
enum IntegrityEventType {
  /// Скриншот авсан (iOS: дараа нь мэдэгддэг; Android 14+: системийн callback).
  screenshot,

  /// Дэлгэц бичлэг (эсвэл AirPlay, mirroring) эхэлсэн — агуулгыг нууна.
  recordingStarted,

  /// Дэлгэц бичлэг зогссон.
  recordingStopped,

  /// Апп арын дэвсгэрт орсон (`hidden`, `paused`). `inactive` (дуудлага, системийн
  /// цонх) энд ОРОХГҮЙ.
  backgrounded,

  /// Арын дэвсгэрээс буцаж ирсэн.
  resumed,
}

/// Нэг үйл явдал + төхөөрөмжийн цаг (зөвхөн харуулахад; серверт сервер өөрөө цаг тавина).
@immutable
class IntegrityEvent {
  const IntegrityEvent(this.type, this.at);

  final IntegrityEventType type;
  final DateTime at;

  @override
  bool operator ==(Object other) => other is IntegrityEvent && other.type == type && other.at == at;

  @override
  int get hashCode => Object.hash(type, at);

  @override
  String toString() => 'IntegrityEvent(${type.name}, ${at.toIso8601String()})';
}
