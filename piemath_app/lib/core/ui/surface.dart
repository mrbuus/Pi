import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';

import 'icons.dart';
import 'motion.dart';
import 'tokens.dart';

/// Карт — вэбийн `chunky` хэв маягийн апп хувилбар: дэвсгэр нь ҮРГЭЛЖ `surface` (цагаан/бараан саарал),
/// 1.5px хүрээ, доороо 3px хатуу «уруул» ([AppColors.lip]) — сүүдэр, blur биш «сурах бичгийн 3D».
/// Дарахад нүүр нь уруул руугаа 2px шигдэнэ (зөвхөн transform). Өнгөт дэвсгэртэй карт ХОРИОТОЙ (RULES §3):
/// өнгийг зөвхөн [accent] зурвас, [IconTile], дүрсэнд.
class AppCard extends StatefulWidget {
  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(AppSpace.lg),
    this.onTap,
    this.accent,
    this.semanticLabel,
    this.lip = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  /// Зүүн талын 4px босоо зурвас (анги, төлөвийн өнгө — бичвэр дээр биш, STATUS §6.4).
  final Color? accent;
  final String? semanticLabel;

  /// Доод уруултай эсэх. Карт дотор байрлах дэд хавтан, sheet дотор `false`.
  final bool lip;

  /// Уруулын өндөр.
  static const lipHeight = 3.0;

  /// Хүрээний зузаан.
  static const borderWidth = 1.5;

  /// Дарахад шигдэх зай.
  static const pressDepth = 2.0;

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> with SingleTickerProviderStateMixin {
  // 0 = чөлөөтэй, 1 = дарсан. Зөвхөн дарагддаг картад үүснэ.
  AnimationController? _press;

  AnimationController _controller() => _press ??= AnimationController.unbounded(vsync: this);

  void _to(double target) {
    if (!mounted) return;
    final c = _controller();
    if (AppMotion.reduced(context)) {
      c.value = 0;
      return;
    }
    c.animateWith(SpringSimulation(AppSprings.press, c.value, target, c.velocity));
  }

  @override
  void dispose() {
    _press?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final radius = BorderRadius.circular(AppRadius.xl);
    final accent = widget.accent;
    Widget content = Padding(padding: widget.padding, child: widget.child);
    if (accent != null) {
      content = Stack(
        children: [
          content,
          PositionedDirectional(
            start: 0,
            top: AppSpace.md,
            bottom: AppSpace.md,
            width: 4,
            child: DecoratedBox(
              decoration: BoxDecoration(
                color: accent,
                borderRadius: const BorderRadiusDirectional.horizontal(end: Radius.circular(4)),
              ),
            ),
          ),
        ],
      );
    }
    final onTap = widget.onTap;
    Widget face = Material(
      color: c.surface,
      shape: RoundedRectangleBorder(
        borderRadius: radius,
        side: BorderSide(color: c.line, width: AppCard.borderWidth),
      ),
      clipBehavior: Clip.antiAlias,
      child: onTap == null ? content : InkWell(onTap: onTap, child: content),
    );
    if (onTap != null && widget.lip) {
      final press = _controller();
      face = Listener(
        onPointerDown: (_) => _to(1),
        onPointerUp: (_) => _to(0),
        onPointerCancel: (_) => _to(0),
        child: AnimatedBuilder(
          animation: press,
          builder: (context, child) =>
              Transform.translate(offset: Offset(0, press.value.clamp(0.0, 1.2) * AppCard.pressDepth), child: child),
          child: face,
        ),
      );
    }
    final Widget card = widget.lip
        ? Stack(
            // Эцгийн өргөн (ба тогтсон өндөр)-ийг нүүрэнд дамжуулна — уруул, нүүр ижил хэмжээтэй.
            fit: StackFit.passthrough,
            children: [
              Positioned.fill(
                top: AppCard.lipHeight,
                child: DecoratedBox(
                  decoration: BoxDecoration(color: c.lip, borderRadius: radius),
                ),
              ),
              Padding(
                padding: const EdgeInsets.only(bottom: AppCard.lipHeight),
                child: face,
              ),
            ],
          )
        : face;
    return Semantics(
      container: true,
      button: onTap != null,
      label: widget.semanticLabel,
      child: onTap == null || widget.lip ? card : PressableScale(child: card),
    );
  }
}

/// Жижиг дүрсний хавтан: цайвар [AppHue.tint] дэвсгэр дээр [AppHue.fg] дүрс. Хэсэг, ангиллыг өнгөөр
/// ялгах ЦОРЫН ГАНЦ газар (карт өөрөө үргэлж цагаан/саарал).
class IconTile extends StatelessWidget {
  const IconTile(this.icon, {super.key, this.hue = AppHue.brand, this.size = 40, this.semanticLabel});

  final IconData icon;
  final AppHue hue;
  final double size;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SizedBox.square(
      dimension: size,
      child: DecoratedBox(
        decoration: BoxDecoration(color: hue.tint(c), borderRadius: BorderRadius.circular(size * 0.3)),
        child: Icon(icon, size: size * 0.5, color: hue.fg(c), semanticLabel: semanticLabel),
      ),
    );
  }
}

/// Картын толгой: дүрсний хавтан + гарчиг + баруун талын зүйл (огноо, «Бүгд»). Төгсгөлд цэггүй.
class CardHeader extends StatelessWidget {
  const CardHeader({super.key, required this.title, this.icon, this.hue = AppHue.brand, this.trailing, this.subtitle});

  final String title;
  final IconData? icon;
  final AppHue hue;
  final Widget? trailing;
  final String? subtitle;

  @override
  Widget build(BuildContext context) {
    final i = icon;
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 32),
      child: Row(
        children: [
          if (i != null) ...[IconTile(i, hue: hue, size: 32), const SizedBox(width: AppSpace.md)],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Semantics(
                  header: true,
                  child: Text(title, style: context.text.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                ),
                if (subtitle != null) Text(subtitle!, style: context.text.bodySmall),
              ],
            ),
          ),
          if (trailing != null) DefaultTextStyle.merge(style: context.text.bodySmall, child: trailing!),
        ],
      ),
    );
  }
}

/// Гарчигтай карт: [CardHeader] + агуулга.
class TitledCard extends StatelessWidget {
  const TitledCard({
    super.key,
    required this.title,
    required this.child,
    this.icon,
    this.hue = AppHue.brand,
    this.trailing,
    this.padding = const EdgeInsets.all(AppSpace.lg),
    this.gap = AppSpace.md,
  });

  final String title;
  final Widget child;
  final IconData? icon;
  final AppHue hue;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;
  final double gap;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeader(title: title, icon: icon, hue: hue, trailing: trailing),
          SizedBox(height: gap),
          child,
        ],
      ),
    );
  }
}

/// Том дарагддаг үйлдлийн карт: дүрсний хавтан + гарчиг + тайлбар + сум. Хүрэх талбай хамгийн багадаа 64dp.
class ActionCard extends StatelessWidget {
  const ActionCard({
    super.key,
    required this.icon,
    required this.title,
    required this.onTap,
    this.subtitle,
    this.hue = AppHue.brand,
    this.chevron = true,
    this.stacked = false,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final AppHue hue;
  final VoidCallback onTap;
  final bool chevron;

  /// Дүрс дээр, бичвэр доор — 2 багана болгож тавихад урт гарчиг таслагдахгүй.
  final bool stacked;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      onTap: onTap,
      semanticLabel: subtitle == null ? title : '$title, $subtitle',
      padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.md, AppSpace.sm, AppSpace.md),
      child: ExcludeSemantics(
        child: stacked
            ? Padding(
                padding: const EdgeInsetsDirectional.only(end: AppSpace.xs),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    IconTile(icon, hue: hue, size: 40),
                    const SizedBox(height: AppSpace.sm),
                    Text(title, style: context.text.titleSmall),
                    if (subtitle != null) Text(subtitle!, style: context.text.bodySmall),
                  ],
                ),
              )
            : ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 44),
                child: Row(
                  children: [
                    IconTile(icon, hue: hue, size: 40),
                    const SizedBox(width: AppSpace.md),
                    Expanded(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(title, style: context.text.titleSmall, maxLines: 2, overflow: TextOverflow.ellipsis),
                          if (subtitle != null)
                            Text(
                              subtitle!,
                              style: context.text.bodySmall,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                        ],
                      ),
                    ),
                    if (chevron) Icon(AppIcons.forward, size: 18, color: c.inkDim),
                  ],
                ),
              ),
      ),
    );
  }
}

/// Жагсаалтын мөр (бүлэг карт доторх): [leading] (ихэвчлэн [IconTile]) + гарчиг + дэд мөр + [trailing].
/// Дарагддаг бол баруун талд сум, өндөр хамгийн багадаа 56dp.
class ListRow extends StatelessWidget {
  const ListRow({super.key, required this.title, this.subtitle, this.leading, this.trailing, this.onTap});

  final String title;
  final String? subtitle;
  final Widget? leading;
  final Widget? trailing;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final row = ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 56),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
        child: Row(
          children: [
            if (leading != null) ...[leading!, const SizedBox(width: AppSpace.md)],
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: context.text.bodyLarge?.copyWith(fontWeight: FontWeight.w500)),
                  if (subtitle != null) Text(subtitle!, style: context.text.bodySmall),
                ],
              ),
            ),
            if (trailing != null) ...[const SizedBox(width: AppSpace.sm), trailing!],
            if (onTap != null && trailing == null) Icon(AppIcons.forward, size: 18, color: c.inkDim),
          ],
        ),
      ),
    );
    return onTap == null ? row : InkWell(onTap: onTap, child: row);
  }
}

/// Мөрүүдийг нэг картад бүлэглэнэ, хооронд нь доголтой хуваагч.
class ListGroup extends StatelessWidget {
  const ListGroup({super.key, required this.children, this.dividerIndent = AppSpace.lg});

  final List<Widget> children;
  final double dividerIndent;

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) Divider(height: 1, indent: dividerIndent, endIndent: AppSpace.lg, color: context.colors.line),
            children[i],
          ],
        ],
      ),
    );
  }
}

/// Төлөвийн жижиг шошго: цайвар дэвсгэр + өнгөт дүрс, бичвэр (өнгө + дүрс + үг гурвуулаа).
class TonePill extends StatelessWidget {
  const TonePill({super.key, required this.label, this.icon, this.hue = AppHue.neutral});

  final String label;
  final IconData? icon;
  final AppHue hue;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fg = hue.fg(c);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(color: hue.tint(c), borderRadius: BorderRadius.circular(AppRadius.pill)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 14, color: fg), const SizedBox(width: 4)],
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: context.text.labelMedium?.copyWith(color: fg, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}

/// Эхний үсгийн дугуй тэмдэг (зураггүй үед). Хар хөхийн цайвар дэвсгэр дээр.
class InitialsAvatar extends StatelessWidget {
  const InitialsAvatar({super.key, required this.initials, this.size = 48, this.image});

  final String initials;
  final double size;

  /// Байвал зураг (алдаа гарвал үсэг).
  final ImageProvider? image;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final letters = Text(
      initials,
      style: context.text.titleMedium?.copyWith(color: c.brand, fontSize: size * 0.36, fontWeight: FontWeight.w700),
    );
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(color: c.brandTint, shape: BoxShape.circle),
      child: image == null
          ? letters
          : Image(
              image: image!,
              width: size,
              height: size,
              fit: BoxFit.cover,
              semanticLabel: 'Профайл зураг',
              errorBuilder: (_, _, _) => letters,
            ),
    );
  }
}

/// Нүүрний мэндчилгээ: огнооны жижиг мөр, «Сайн байна уу», нэр, зүүн талд зураг/үсэг.
class GreetingHeader extends StatelessWidget {
  const GreetingHeader({
    super.key,
    required this.name,
    this.dateLine,
    this.greeting = 'Сайн байна уу',
    this.leading,
    this.trailing,
  });

  final String name;
  final String? dateLine;
  final String greeting;
  final Widget? leading;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        if (leading != null) ...[leading!, const SizedBox(width: AppSpace.md)],
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (dateLine != null)
                Text(dateLine!, style: context.text.labelMedium?.copyWith(color: context.colors.inkDim)),
              Text(greeting, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
              Text(name, style: context.text.headlineSmall, maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          ),
        ),
        ?trailing,
      ],
    );
  }
}

/// Хэсгийн гарчиг (картын дээр). Төгсгөлд цэг тавихгүй.
class SectionHeader extends StatelessWidget {
  const SectionHeader({super.key, required this.title, this.trailing, this.padding});

  final String title;
  final Widget? trailing;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: padding ?? const EdgeInsets.only(top: AppSpace.xl, bottom: AppSpace.sm),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(title, style: context.text.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// Хуудасны том гарчиг + сонголтоор дэд мөр.
class PageHeader extends StatelessWidget {
  const PageHeader({super.key, required this.title, this.subtitle, this.trailing});

  final String title;
  final Widget? subtitle;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpace.lg),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Semantics(header: true, child: Text(title, style: context.text.headlineMedium)),
                if (subtitle != null) ...[
                  const SizedBox(height: AppSpace.xs),
                  DefaultTextStyle.merge(style: context.text.bodySmall, child: subtitle!),
                ],
              ],
            ),
          ),
          ?trailing,
        ],
      ),
    );
  }
}

/// «i» тэмдэг — жижиг тайлбар бичвэр олшруулахын оронд (STATUS §3.5, RULES §3).
/// Дарахад доороос тайлбар гарна.
class InfoHint extends StatelessWidget {
  const InfoHint({super.key, required this.title, required this.message});

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: title,
      icon: Icon(AppIcons.info, size: 18, color: context.colors.inkDim),
      onPressed: () => showModalBottomSheet<void>(
        context: context,
        builder: (ctx) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.xl, 0, AppSpace.xl, AppSpace.xl),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: ctx.text.titleMedium),
                const SizedBox(height: AppSpace.sm),
                Text(message, style: ctx.text.bodyMedium),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
