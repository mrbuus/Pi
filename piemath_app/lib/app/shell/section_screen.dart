import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';

import '../../core/ui/ui.dart';
import '../nav/nav_data.dart';

/// Хэсгийн нэг дэд хуудас: тухайн замын хуудсыг зурах функц (feature-ийн маршрутаас).
@immutable
class SectionPage {
  const SectionPage({required this.link, required this.builder, this.actions});

  final NavLink link;
  final WidgetBuilder builder;

  /// Хэсгийн AppBar-т харуулах үйлдлүүд — дэд хуудасны өөрийн AppBar-ын мөр нуугддаг тул.
  final WidgetBuilder? actions;
}

/// Дэд табтай хэсэг: AppBar (хэсгийн нэр) + доор нь тогтсон, гүйлгэдэг «pill» дэд табууд +
/// хуруугаар шилждэг хуудсууд.
///
/// - Дэд таб бүр өөрийн замтай (`/app/planner` …) — deep link шууд тухайн таб руу.
/// - Солиход замыг `go`-оор шинэчилнэ; бүх дэд зам ижил хуудасны key-тэй тул хуудас дахин
///   үүсэхгүй (state, гүйлгэлт хадгалагдана), доод таб буцаж ирэхэд сүүлийн дэд таб нээгдэнэ.
/// - Дэд хуудас анх харагдах үедээ л зурагдана, дараа нь амьд үлдэнэ (keep-alive).
/// - Дэд хуудасны өөрийн AppBar-ын гарчгийн мөрийг нууна (давхар гарчиггүй); доторх таб (`bottom`) үлдэнэ.
class SectionScreen extends StatefulWidget {
  const SectionScreen({super.key, required this.section, required this.pages, required this.index});

  final NavSection section;
  final List<SectionPage> pages;

  /// Одоогийн замд харгалзах дэд таб.
  final int index;

  /// Дэд таб солих хөдөлгөөн (хөдөлгөөн багасгах, сул төхөөрөмжид шууд).
  static const switchDuration = Duration(milliseconds: 220);

  @override
  State<SectionScreen> createState() => _SectionScreenState();
}

class _SectionScreenState extends State<SectionScreen> with SingleTickerProviderStateMixin {
  TabController? _controller;
  late final List<ScrollController> _scrolls = [for (final _ in widget.pages) ScrollController()];

  TabController get _tabs => _controller!;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Хөдөлгөөн багасгах тохиргоо MediaQuery-ээс — initState-д уншиж болохгүй тул энд, нэг удаа.
    _controller ??= TabController(
      length: widget.pages.length,
      vsync: this,
      initialIndex: widget.index.clamp(0, widget.pages.length - 1),
      animationDuration: decorativeMotionOff(context) ? Duration.zero : SectionScreen.switchDuration,
    )..addListener(_onTabChanged);
  }

  @override
  void didUpdateWidget(SectionScreen old) {
    super.didUpdateWidget(old);
    // Гаднаас (deep link, мэдэгдэл) өөр дэд таб руу шилжсэн.
    if (widget.index != _tabs.index && !_tabs.indexIsChanging) {
      _tabs.animateTo(widget.index);
    }
  }

  void _onTabChanged() {
    if (_tabs.indexIsChanging || _tabs.index == widget.index) return;
    // Хуруугаар гулгуулсан эсвэл товшсон — замыг шинэчилнэ (буцах, deep link, сүүлийн таб санах).
    GoRouter.of(context).go(widget.pages[_tabs.index].link.path);
  }

  @override
  void dispose() {
    _tabs
      ..removeListener(_onTabChanged)
      ..dispose();
    for (final c in _scrolls) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.section.title),
        actions: [
          AnimatedBuilder(
            animation: _tabs,
            builder: (context, _) => widget.pages[_tabs.index].actions?.call(context) ?? const SizedBox.shrink(),
          ),
        ],
        bottom: SubTabBar(
          controller: _tabs,
          labels: [for (final p in widget.pages) p.link.tabLabel],
          semanticLabels: [for (final p in widget.pages) p.link.label],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [
          for (var i = 0; i < widget.pages.length; i++)
            _EmbeddedPage(
              key: ValueKey(widget.pages[i].link.path),
              scroll: _scrolls[i],
              child: Builder(builder: widget.pages[i].builder),
            ),
        ],
      ),
    );
  }
}

/// Дээд дэд табын мөр: гүйлгэдэг, «pill» тодотголтой (сонгогдсон нь цайвар хөх дэвсгэр + хар хөх бичвэр).
/// Тодотгол хуруу дагаж гулсана; хүрэх талбай 48dp.
class SubTabBar extends StatelessWidget implements PreferredSizeWidget {
  const SubTabBar({super.key, required this.controller, required this.labels, this.semanticLabels});

  final TabController controller;
  final List<String> labels;

  /// Дэлгэц уншигчид бүтэн нэр (богино шошго хангалтгүй үед).
  final List<String>? semanticLabels;

  static const height = 52.0;

  @override
  Size get preferredSize => const Size.fromHeight(height);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = context.text.labelLarge?.copyWith(fontWeight: FontWeight.w600);
    return SizedBox(
      height: height,
      child: TabBar(
        controller: controller,
        isScrollable: true,
        tabAlignment: TabAlignment.start,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter - AppSpace.xs),
        labelPadding: const EdgeInsets.symmetric(horizontal: AppSpace.lg),
        indicator: BoxDecoration(color: c.brandTint, borderRadius: BorderRadius.circular(AppRadius.pill)),
        indicatorSize: TabBarIndicatorSize.tab,
        indicatorPadding: const EdgeInsets.symmetric(vertical: 8),
        dividerColor: c.line,
        dividerHeight: 1,
        labelColor: c.brand,
        unselectedLabelColor: c.inkDim,
        labelStyle: style,
        unselectedLabelStyle: style?.copyWith(fontWeight: FontWeight.w500),
        splashFactory: NoSplash.splashFactory,
        overlayColor: const WidgetStatePropertyAll(Colors.transparent),
        onTap: (_) => HapticFeedback.selectionClick(),
        tabs: [
          for (var i = 0; i < labels.length; i++)
            Tab(
              height: height - 1,
              child: Semantics(
                label: semanticLabels?[i],
                excludeSemantics: semanticLabels != null,
                child: Text(labels[i]),
              ),
            ),
        ],
      ),
    );
  }
}

/// Хэсэг доторх дэд хуудас: анх харагдахад зурагдаад амьд үлдэнэ, өөрийн гүйлгэлттэй
/// (`PrimaryScrollController`), өөрийн AppBar-ын гарчгийн мөр нуугдана.
class _EmbeddedPage extends StatefulWidget {
  const _EmbeddedPage({super.key, required this.scroll, required this.child});

  final ScrollController scroll;
  final Widget child;

  @override
  State<_EmbeddedPage> createState() => _EmbeddedPageState();
}

class _EmbeddedPageState extends State<_EmbeddedPage> with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  Widget build(BuildContext context) {
    super.build(context);
    // `toolbarHeight: 0` — дэд хуудасны AppBar-ын гарчиг/товчны мөр алга болно (Scaffold түүнийг
    // `AppBar.preferredHeightFor`-оор тооцдог тул хоосон зай үлдэхгүй); доторх `bottom` таб хэвээр.
    return AppBarTheme(
      data: AppBarTheme.of(context).copyWith(toolbarHeight: 0),
      child: PrimaryScrollController(controller: widget.scroll, child: widget.child),
    );
  }
}
