import 'package:flutter/material.dart';

import '../../core/ui/ui.dart';

/// Мета чипийн өнгөний утга — өнгө ЗӨВХӨН дүрс, бичвэрт; дэвсгэр үргэлж саарал (RULES §3).
enum ChipTone { neutral, brand, success, warning, error, info }

/// Жижиг мета чип: «9-р анги», «Төлсөн», «Идэвхтэй». Дэвсгэр `surfaceSunken`.
class MetaChip extends StatelessWidget {
  const MetaChip({super.key, required this.label, this.icon, this.tone = ChipTone.neutral});

  final String label;
  final IconData? icon;
  final ChipTone tone;

  static Color toneColor(BuildContext context, ChipTone tone) {
    final c = context.colors;
    return switch (tone) {
      ChipTone.neutral => c.inkDim,
      ChipTone.brand => c.brand,
      ChipTone.success => c.success,
      ChipTone.warning => c.warning,
      ChipTone.error => c.error,
      ChipTone.info => c.info,
    };
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final color = toneColor(context, tone);
    return DecoratedBox(
      decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (icon != null) ...[Icon(icon, size: 14, color: color), const SizedBox(width: 6)],
            // Урт шошго нарийн мөрөнд халихгүй, төгсгөлөөрөө таслагдана
            Flexible(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: context.text.labelMedium?.copyWith(color: tone == ChipTone.neutral ? c.ink : color),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Дэлгэрэнгүйн үйлдэл (товч).
@immutable
class DetailAction {
  const DetailAction({required this.label, required this.onPressed, this.icon, this.destructive = false});

  final String label;
  final IconData? icon;

  /// `null` бол идэвхгүй товч.
  final VoidCallback? onPressed;

  /// Устгах, архивлах — улаан бичвэртэй.
  final bool destructive;
}

/// Дугуй аватар: нэрийн эхний үсэг эсвэл дүрс. Дэвсгэр нь цайвар хөх «pill» (картын дэвсгэр биш).
class DetailAvatar extends StatelessWidget {
  const DetailAvatar({super.key, this.initials, this.icon, this.size = 56});

  /// «БЭ» — 1–2 үсэг. [icon]-оос давуу.
  final String? initials;
  final IconData? icon;
  final double size;

  /// «Бат-Эрдэнэ Болд» → «ББ».
  static String initialsOf(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '';
    final first = parts.first.characters.first;
    final second = parts.length > 1 ? parts[1].characters.first : '';
    return (first + second).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final text = initials?.trim();
    return ExcludeSemantics(
      child: SizedBox.square(
        dimension: size,
        child: DecoratedBox(
          decoration: BoxDecoration(color: c.brandTint, shape: BoxShape.circle),
          child: Center(
            child: text != null && text.isNotEmpty
                ? Text(
                    text,
                    style: context.text.titleMedium?.copyWith(color: c.brand, fontSize: size * 0.34),
                  )
                : Icon(icon ?? AppIcons.user, color: c.brand, size: size * 0.45),
          ),
        ),
      ),
    );
  }
}

/// Дэлгэрэнгүй хуудасны толгой: аватар/дүрс, гарчиг, дэд гарчиг, мета чипүүд, үндсэн + нэмэлт товч.
///
/// ```dart
/// DetailHeader(
///   title: 'Болд Бат',
///   subtitle: '9А анги',
///   avatar: DetailAvatar(initials: DetailAvatar.initialsOf('Болд Бат')),
///   chips: const [MetaChip(label: 'Төлсөн', icon: AppIcons.success, tone: ChipTone.success)],
///   primary: DetailAction(label: 'Залгах', icon: AppIcons.phone, onPressed: call),
///   secondary: [DetailAction(label: 'Засах', icon: AppIcons.draft, onPressed: edit)],
/// )
/// ```
class DetailHeader extends StatelessWidget {
  const DetailHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.avatar,
    this.chips = const [],
    this.primary,
    this.secondary = const [],
    this.padding = const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.lg, AppSpace.gutter, AppSpace.lg),
  });

  final String title;

  /// `String` эсвэл [Meta]-ийн жагсаалт болгох `List<Object?>`.
  final Object? subtitle;

  /// [DetailAvatar] эсвэл ямар нэг дүрс.
  final Widget? avatar;

  /// [MetaChip]-үүд (эсвэл өөр жижиг widget).
  final List<Widget> chips;
  final DetailAction? primary;
  final List<DetailAction> secondary;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final sub = subtitle;
    return Padding(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              if (avatar != null) ...[avatar!, const SizedBox(width: AppSpace.lg)],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(header: true, child: Text(title, style: context.text.headlineSmall)),
                    if (sub is String && sub.isNotEmpty) ...[
                      const SizedBox(height: 2),
                      Text(sub, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
                    ] else if (sub is List<Object?>) ...[
                      const SizedBox(height: 2),
                      Meta(
                        items: sub,
                        style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
          if (chips.isNotEmpty) ...[
            const SizedBox(height: AppSpace.md),
            Wrap(spacing: AppSpace.sm, runSpacing: AppSpace.sm, children: chips),
          ],
          if (primary != null || secondary.isNotEmpty) ...[
            const SizedBox(height: AppSpace.lg),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                if (primary != null) _button(context, primary!, primary: true),
                for (final a in secondary) _button(context, a, primary: false),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _button(BuildContext context, DetailAction a, {required bool primary}) {
    final icon = a.icon == null ? null : Icon(a.icon, size: 18);
    if (primary) {
      final style = a.destructive
          ? FilledButton.styleFrom(backgroundColor: context.colors.error, foregroundColor: context.colors.onStatus)
          : null;
      return icon == null
          ? FilledButton(onPressed: a.onPressed, style: style, child: Text(a.label))
          : FilledButton.icon(onPressed: a.onPressed, style: style, icon: icon, label: Text(a.label));
    }
    final style = a.destructive ? OutlinedButton.styleFrom(foregroundColor: context.colors.error) : null;
    return icon == null
        ? OutlinedButton(onPressed: a.onPressed, style: style, child: Text(a.label))
        : OutlinedButton.icon(onPressed: a.onPressed, style: style, icon: icon, label: Text(a.label));
  }
}
