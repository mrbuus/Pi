// Бодогчийн түүх (вэбийн `solve-history-v2`): зөвхөн энэ төхөөрөмжид, нэвтрэлтээс үл хамаарна,
// 30 хүртэл, цэвэрлэж болно. Хувийн мэдээлэл агуулахгүй (бодлогын бичвэр л).
import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

/// Түүхийн нэг мөр: энгийн бодлого ([action] нь SolveAction нэр) эсвэл прогресс/магадлал ([seqSub]).
class SolveHistoryItem {
  const SolveHistoryItem({
    this.text = '',
    this.action,
    this.seqSub,
    this.extra = const {},
    this.degrees = false,
    this.title = '',
  });

  factory SolveHistoryItem.fromJson(Map<String, dynamic> j) {
    final extra = j['extra'];
    return SolveHistoryItem(
      text: j['text'] as String? ?? '',
      action: j['action'] as String?,
      seqSub: j['seqSub'] as String?,
      extra: {
        if (extra is Map)
          for (final e in extra.entries)
            if (e.value is String) e.key.toString(): e.value as String,
      },
      degrees: j['degrees'] == true,
      title: j['title'] as String? ?? '',
    );
  }

  final String text;
  final String? action;
  final String? seqSub;
  final Map<String, String> extra;
  final bool degrees;
  final String title;

  bool get isSeq => seqSub != null;

  /// Давхардлыг тогтооно (вэбтэй адил: бичвэр, үйлдэл, дэд төрөл, талбарууд).
  String get key => jsonEncode([text, action, seqSub, extra]);

  Map<String, dynamic> toJson() => {
    'text': text,
    if (action != null) 'action': action,
    if (seqSub != null) 'seqSub': seqSub,
    if (extra.isNotEmpty) 'extra': extra,
    'degrees': degrees,
    'title': title,
  };
}

const solveHistoryMax = 30;

/// Шинийг эхэнд нь тавина, адилыг арилгана, [solveHistoryMax]-аар таслана.
List<SolveHistoryItem> pushHistory(List<SolveHistoryItem> list, SolveHistoryItem item) =>
    [item, ...list.where((h) => h.key != item.key)].take(solveHistoryMax).toList();

class SolveHistoryStore {
  const SolveHistoryStore();

  static const prefsKey = 'tools.solve.history.v1';

  Future<List<SolveHistoryItem>> load() async {
    try {
      final raw = (await SharedPreferences.getInstance()).getString(prefsKey);
      if (raw == null) return const [];
      final data = jsonDecode(raw);
      if (data is! List) return const [];
      return [
        for (final e in data)
          if (e is Map<String, dynamic>) SolveHistoryItem.fromJson(e),
      ].take(solveHistoryMax).toList();
    } catch (_) {
      return const [];
    }
  }

  Future<void> save(List<SolveHistoryItem> items) async {
    try {
      final p = await SharedPreferences.getInstance();
      if (items.isEmpty) {
        await p.remove(prefsKey);
      } else {
        await p.setString(prefsKey, jsonEncode([for (final h in items) h.toJson()]));
      }
    } catch (_) {
      // Хадгалах боломжгүй бол түүх энэ удаа л үлдэнэ — бодолтод саад болохгүй.
    }
  }
}
