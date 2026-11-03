import 'package:flutter/material.dart';

/// Мета тусгаарлагч цэг — U+00B7, U+2022 тэмдэгт БИШ (RULES §3, STATUS §6.3).
///
/// Фонтын глиф нь фонт бүрт өөр диаметртэй, «бүдүүн хар толбо» болдог тул цэгийг
/// өөрөө зурна: яг 3px, 35% тунгалаг, бичвэрийн өнгөөр. Дэлгэц уншигч уншихгүй.
class Dot extends StatelessWidget {
  const Dot({super.key, this.color});

  /// Өгөөгүй бол ойролцоох `DefaultTextStyle`-ийн өнгө.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = color ?? DefaultTextStyle.of(context).style.color ?? Theme.of(context).colorScheme.onSurface;
    return ExcludeSemantics(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6),
        child: SizedBox.square(
          dimension: 3,
          child: DecoratedBox(
            decoration: BoxDecoration(color: c.withValues(alpha: 0.35), shape: BoxShape.circle),
          ),
        ),
      ),
    );
  }
}

/// Хэд хэдэн мета зүйлийг [Dot]-оор зааглана. Хоосон (null, '') зүйлийг алгасна.
///
/// ```dart
/// Meta(items: [room, teacher, time])
/// ```
class Meta extends StatelessWidget {
  const Meta({super.key, required this.items, this.style});

  /// `String` эсвэл `Widget`. `null`, хоосон мөр алгасагдана.
  final List<Object?> items;
  final TextStyle? style;

  static List<Object> visible(List<Object?> items) => [
    for (final x in items)
      if (x != null && !(x is String && x.trim().isEmpty)) x,
  ];

  @override
  Widget build(BuildContext context) {
    final shown = visible(items);
    if (shown.isEmpty) return const SizedBox.shrink();
    final base = style ?? Theme.of(context).textTheme.bodySmall;
    final children = <Widget>[];
    for (var i = 0; i < shown.length; i++) {
      if (i > 0) children.add(const Dot());
      final item = shown[i];
      children.add(item is Widget ? item : Text(item.toString(), style: base));
    }
    return DefaultTextStyle.merge(
      style: base,
      child: Semantics(
        // Дэлгэц уншигчид «501, Багш, 15:00» гэж таслалаар уншина.
        label: shown.whereType<String>().join(', '),
        child: ExcludeSemantics(
          excluding: shown.every((e) => e is String),
          child: Wrap(crossAxisAlignment: WrapCrossAlignment.center, runSpacing: 2, children: children),
        ),
      ),
    );
  }
}

/// Сангаас ирсэн, дунд цэгээр (U+00B7) зааглагдсан гарчгийг (импортын хуучин өгөгдөл)
/// цэвэрхэн харуулна — зөвхөн хоёр талдаа зайтай цэгийг задалж [Dot]-оор солино (вэбийн `MetaTitle`).
class MetaTitle extends StatelessWidget {
  const MetaTitle(this.title, {super.key, this.style});

  final String? title;
  final TextStyle? style;

  /// Хоёр талдаа зайтай дунд цэгээр задлах. Үгийн дундах цэгийг хөндөхгүй.
  static List<String> split(String title) => title.split(RegExp('\\s+\u00B7\\s+')).where((s) => s.isNotEmpty).toList();

  @override
  Widget build(BuildContext context) {
    final t = title;
    if (t == null || t.isEmpty) return const SizedBox.shrink();
    final parts = split(t);
    final s = style ?? DefaultTextStyle.of(context).style;
    if (parts.length == 1) return Text(parts.first, style: s);
    return Meta(items: parts, style: s);
  }
}
