// Төлбөрийн хэсгийн харагдах хэлбэр (вэбийн `components/payments/ledgerFormat.ts`).
// Энд мөнгө ТООЦОХГҮЙ — серверийн утгыг бичвэр болгоно. Огноо бүсээр гулсуулахгүй.

import '../../../shared/payment_status/money.dart';

/// «2026-10» → 10. Буруу бол 0.
int monthNo(String ym) => ym.length >= 7 ? int.tryParse(ym.substring(5, 7)) ?? 0 : 0;

/// «2026-10» → «10-р сар».
String monthName(String ym) => '${monthNo(ym)}-р сар';

/// Дүн (null бол хоосон) — Багш+-д сервер дүнг null болгодог.
String mntOrEmpty(int? n) => n == null ? '' : formatMnt(n);

/// Блок дээрх товч дүн: 150000 → «150к», 1250000 → «1.25с».
String shortMnt(int? n) {
  if (n == null) return '';
  if (n >= 1000000) {
    final s = (n / 1000000).toStringAsFixed(2).replaceFirst(RegExp(r'\.?0+$'), '');
    return '$sс';
  }
  if (n >= 1000) return '${(n / 1000).round()}к';
  return '$n';
}

/// «2026-10-07» (эсвэл ISO) → «10/07».
String dayLabel(String? iso) {
  if (iso == null || iso.length < 10) return '';
  return '${iso.substring(5, 7)}/${iso.substring(8, 10)}';
}

/// ISO хугацааг Улаанбаатарын «MM/DD HH:mm» болгоно (вэбийн `stampLabel`).
String stampLabel(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final t = DateTime.tryParse(iso);
  if (t == null) return dayLabel(iso);
  final d = t.toUtc().add(const Duration(hours: 8));
  String p(int x) => x.toString().padLeft(2, '0');
  return '${p(d.month)}/${p(d.day)} ${p(d.hour)}:${p(d.minute)}';
}

/// «2026-09-04» + 3 → «2026-09-07» (UTC өдрөөр, бүсгүй).
String addDays(String key, int days) {
  final d = DateTime.tryParse('${key}T00:00:00Z');
  if (d == null) return key;
  final r = d.add(Duration(days: days));
  String p(int x) => x.toString().padLeft(2, '0');
  return '${r.year}-${p(r.month)}-${p(r.day)}';
}

/// Сарын төлбөрийн хамрах хугацааг сервер өгөөгүй үед (бүтэн жилийн багц) вэбийн `periodOf`-той ижил
/// «10/01–11/01»: хичээлийн жил эхлэхээс өмнө орсон бол 1, үгүй бол сууж эхэлсэн өдөр (28 хүртэл).
String fallbackPeriod(String month, String? startDate, String? yearStart) {
  String p(int x) => x.toString().padLeft(2, '0');
  final startMonth = startDate != null && startDate.length >= 7 ? startDate.substring(0, 7) : null;
  final day = startMonth == null || (yearStart != null && startMonth.compareTo(yearStart) < 0)
      ? 1
      : (int.tryParse(startDate!.length >= 10 ? startDate.substring(8, 10) : '') ?? 1).clamp(1, 28);
  final m = monthNo(month);
  return '${p(m)}/${p(day)}–${p((m % 12) + 1)}/${p(day)}';
}
