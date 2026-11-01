import '../data/payment_record.dart';

/// Төлбөрийн түүхийн харагдах тооцоо (вэбийн `StudentPaymentsClient`) — ӨРИЙН тооцоо БИШ.
/// Өр, хоцролт, багц бүгд сервер дээр (STATUS §7.23).
class PaymentHistory {
  PaymentHistory(List<PaymentRecord> payments) : groups = _group(payments) {
    for (final p in payments) {
      if (p.status == 'CONFIRMED') totalConfirmed += p.amount;
      if (p.status == 'PENDING') totalPending += p.amount;
    }
  }

  /// «Нийт төлсөн» — CONFIRMED-ийн нийлбэр.
  num totalConfirmed = 0;

  /// «Баталгаажихыг хүлээж буй» — PENDING-ийн нийлбэр.
  num totalPending = 0;

  /// Сараар (төлсөн огноо, байхгүй бол бүртгэсэн огноо), шинэ нь эхэнд.
  final List<(String month, List<PaymentRecord> rows)> groups;

  bool get isEmpty => groups.isEmpty;

  static List<(String, List<PaymentRecord>)> _group(List<PaymentRecord> payments) {
    String when(PaymentRecord p) => p.paidAt ?? p.createdAt;
    final sorted = [...payments]..sort((a, b) => when(b).compareTo(when(a)));
    final out = <(String, List<PaymentRecord>)>[];
    for (final p in sorted) {
      final key = when(p).length >= 7 ? when(p).substring(0, 7) : when(p);
      if (out.isNotEmpty && out.last.$1 == key) {
        out.last.$2.add(p);
      } else {
        out.add((key, [p]));
      }
    }
    return out;
  }
}

/// «2026-09» → «2026 оны 9-р сар».
String paymentMonthLabel(String ym) {
  final m = RegExp(r'^(\d{4})-(\d{1,2})').firstMatch(ym);
  if (m == null) return ym;
  return '${m.group(1)} оны ${int.parse(m.group(2)!)}-р сар';
}

/// ISO / `@db.Date` → «2026.10.07» (эхний 10 тэмдэгт, бүсээр гулсуулахгүй — вэбийн `dateLabel`).
String isoDateLabel(String iso) {
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(iso);
  if (m == null) return iso;
  return '${m.group(1)}.${m.group(2)}.${m.group(3)}';
}
