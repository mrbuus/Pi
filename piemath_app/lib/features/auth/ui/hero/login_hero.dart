import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:video_player/video_player.dart';

import '../../../../core/ui/ui.dart';
import '../../../../shared/anim/animation_slot.dart';
import 'login_hero_media.dart';

/// Нэвтрэх хуудасны дээд хэсэг. Медиа байхгүй бол лого (BrandMark); `assets/login_hero/`-д
/// видео / poster орвол тэр. Нэвтрэхэд хэзээ ч саад болохгүй (docs/LOGIN-HERO.md).
class LoginHero extends ConsumerStatefulWidget {
  const LoginHero({super.key, this.height = 176});

  /// Медиатай үеийн өндөр.
  final double height;

  @override
  ConsumerState<LoginHero> createState() => _LoginHeroState();
}

class _LoginHeroState extends ConsumerState<LoginHero> with WidgetsBindingObserver {
  bool _keyboardOpen = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _keyboardOpen = _readKeyboard();
  }

  // Scaffold биеийн viewInsets-ийг тэглэдэг тул гарыг View-ээс шууд уншина.
  bool _readKeyboard() => View.of(context).viewInsets.bottom > 0;

  @override
  void didChangeMetrics() {
    final open = _readKeyboard();
    if (open != _keyboardOpen && mounted) setState(() => _keyboardOpen = open);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final height = widget.height;
    final media = ref.watch(loginHeroMediaProvider).value ?? const LoginHeroMedia.none();
    final keyboardOpen = _keyboardOpen;
    final reduceMotion = MediaQuery.disableAnimationsOf(context);
    final dark = Theme.of(context).brightness == Brightness.dark;
    final poster = media.posterFor(dark);
    final wantsVideo = media.hasVideo(dark) && !reduceMotion;

    Widget content;
    if (media.isEmpty || (!wantsVideo && poster == null)) {
      content = const Align(alignment: AlignmentDirectional.centerStart, child: BrandMark(logoSize: 52));
    } else {
      content = Semantics(
        label: AppStrings.appName,
        image: true,
        child: SizedBox(
          height: height,
          child: ClipRRect(
            borderRadius: BorderRadius.circular(AppRadius.md),
            child: ColoredBox(
              color: context.colors.surface,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (poster != null)
                    Image.asset(
                      poster,
                      fit: BoxFit.cover,
                      excludeFromSemantics: true,
                      errorBuilder: (_, _, _) => const SizedBox(),
                    )
                  else
                    const Center(child: BrandLogo(size: 64)),
                  if (wantsVideo)
                    _HeroVideo(
                      asset: media.videoFor(dark),
                      url: media.remoteUrl,
                      // Гар утасны гар гарсан үед тоглуулахгүй (CPU / батерей).
                      active: !keyboardOpen,
                    ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // Гар нээгдэхэд бүдэгрээд нугарна: opacity + өндрийн коэффициент, input-ууд дээш гарна.
    return TweenAnimationBuilder<double>(
      tween: Tween(end: keyboardOpen ? 0 : 1),
      duration: reduceMotion ? Duration.zero : AppMotion.enter,
      curve: Curves.easeOutCubic,
      child: Padding(
        padding: const EdgeInsets.only(bottom: AppSpace.xl),
        child: content,
      ),
      builder: (context, t, child) => ClipRect(
        child: Align(
          alignment: Alignment.topCenter,
          heightFactor: t,
          child: Opacity(opacity: t, child: child),
        ),
      ),
    );
  }
}

/// Дуугүй, хяналтгүй, давтагдах видео. Эхний frame-ийн дараа л ачаална; алдаа гарвал юу ч харуулахгүй
/// (доорх poster / лого үлдэнэ).
///
/// `AnimSlot.loginHero` слот (`assets/anim/manifest.yaml`): видео тоглож байх үед [AnimLoopGate]-ийг
/// эзэмшинэ — өөр давталттай слот эхэлбэл энэ зогсож, тэр нь дуусахад үргэлжилнэ.
class _HeroVideo extends ConsumerStatefulWidget {
  const _HeroVideo({required this.asset, required this.url, required this.active});

  final String? asset;
  final String? url;
  final bool active;

  @override
  ConsumerState<_HeroVideo> createState() => _HeroVideoState();
}

class _HeroVideoState extends ConsumerState<_HeroVideo> with WidgetsBindingObserver {
  VideoPlayerController? _c;
  bool _ready = false;
  bool _foreground = true;
  bool _tickers = true;
  final Object _gateToken = Object();
  bool _claimed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    AnimLoopGate.owner.addListener(_onGate);
    // Эхний frame зурагдсаны дараа — талбарууд шууд ашиглагдана.
    WidgetsBinding.instance.addPostFrameCallback((_) => _start());
  }

  Future<void> _start() async {
    if (!mounted) return;
    try {
      final c = ref.read(heroVideoControllerFactoryProvider)(
        asset: widget.asset,
        url: widget.asset == null ? widget.url : null,
      );
      _c = c;
      await c.initialize();
      await c.setLooping(true);
      await c.setVolume(0);
      if (!mounted) return;
      setState(() => _ready = true);
      _sync();
    } catch (_) {
      // Poster / лого үлдэнэ.
    }
  }

  void _onGate() => _sync(steal: false);

  void _sync({bool steal = true}) {
    final c = _c;
    if (c == null || !_ready) return;
    var play = widget.active && _foreground && _tickers;
    if (play && !steal && !AnimLoopGate.isFree(_gateToken)) play = false;
    if (play) {
      AnimLoopGate.claim(_gateToken);
      _claimed = true;
    } else if (_claimed) {
      _claimed = false;
      AnimLoopGate.release(_gateToken);
    }
    if (play && !c.value.isPlaying) {
      c.play();
    } else if (!play && c.value.isPlaying) {
      c.pause();
    }
  }

  @override
  void didUpdateWidget(_HeroVideo old) {
    super.didUpdateWidget(old);
    _sync();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _tickers = TickerMode.valuesOf(context).enabled;
    _sync();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    _sync();
  }

  @override
  void dispose() {
    AnimLoopGate.owner.removeListener(_onGate);
    if (_claimed) AnimLoopGate.release(_gateToken);
    WidgetsBinding.instance.removeObserver(this);
    _c?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _c;
    return ExcludeSemantics(
      child: AnimatedOpacity(
        opacity: _ready && c != null ? 1 : 0,
        duration: AppMotion.enter,
        child: _ready && c != null
            ? FittedBox(
                fit: BoxFit.cover,
                clipBehavior: Clip.hardEdge,
                child: SizedBox(width: c.value.size.width, height: c.value.size.height, child: VideoPlayer(c)),
              )
            : const SizedBox.expand(),
      ),
    );
  }
}
