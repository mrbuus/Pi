import 'package:flutter/foundation.dart';

import '../../../core/time/ub_time.dart';
import '../../learning/data/json.dart';

/// `GET /me/passes` — олгогдсон эрх (`UserPass` + `pass`).
@immutable
class BuyerPass {
  const BuyerPass({required this.id, required this.name, required this.expiresAt, this.durationDays});

  factory BuyerPass.fromJson(Object? raw) {
    final j = asMap(raw);
    final pass = asMap(j['pass']);
    return BuyerPass(
      id: asStr(j['id']) ?? '',
      name: asStr(pass['name']) ?? 'Эрх',
      expiresAt: parseApiInstant(asStr(j['expiresAt'])),
      durationDays: asInt(pass['durationDays']),
    );
  }

  final String id;
  final String name;
  final DateTime? expiresAt;
  final int? durationDays;

  /// Хугацаа тодорхойгүй бол идэвхтэй гэж үзэхгүй (вэбтэй адил: `expiresAt > now`).
  bool isActive(DateTime now) => expiresAt != null && expiresAt!.isAfter(now);
}

enum PurchaseKind {
  test('Шалгалт'),
  book('Ном'),
  pass('Багц');

  const PurchaseKind(this.label);

  final String label;

  static PurchaseKind fromApi(String? v) => switch (v) {
    'TEST' => test,
    'BOOK' => book,
    _ => pass,
  };
}

/// Худалдан авалтын эрхийн төлөв (сервер олгосон огноо, дуусах огнооноос).
enum PurchaseState {
  waiting('Хүлээгдэж байна, эрх олгогдоогүй'),
  granted('Эрх олгогдсон'),
  expired('Эрхийн хугацаа дууссан');

  const PurchaseState(this.label);

  final String label;
}

/// `GET /store/my-purchases` — миний худалдан авалтууд (унших л).
@immutable
class BuyerPurchase {
  const BuyerPurchase({
    required this.id,
    required this.title,
    required this.kind,
    required this.price,
    required this.createdAt,
    this.grantedAt,
    this.expiresAt,
  });

  factory BuyerPurchase.fromJson(Object? raw) {
    final j = asMap(raw);
    return BuyerPurchase(
      id: asStr(j['id']) ?? '',
      title: asStr(j['title']) ?? '',
      kind: PurchaseKind.fromApi(asStr(j['kind'])),
      price: asNum(j['price']) ?? 0,
      createdAt: parseApiInstant(asStr(j['createdAt'])),
      grantedAt: parseApiInstant(asStr(j['grantedAt'])),
      expiresAt: parseApiInstant(asStr(j['expiresAt'])),
    );
  }

  final String id;
  final String title;
  final PurchaseKind kind;
  final num price;
  final DateTime? createdAt;
  final DateTime? grantedAt;
  final DateTime? expiresAt;

  PurchaseState state(DateTime now) {
    if (grantedAt == null) return PurchaseState.waiting;
    if (expiresAt != null && !expiresAt!.isAfter(now)) return PurchaseState.expired;
    return PurchaseState.granted;
  }
}
