import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart' show Ticker;
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/math/math.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/math_keyboard/expr.dart';
import '../../ui/tools_back.dart';
import '../domain/graph_math.dart';
import '../domain/labels.dart';
import '../input/func_input.dart';
import '../input/func_keyboard.dart';
import 'graph_painter.dart';

/// Функцийн график (вэбийн `GraphTool`-ын апп хувилбар).
///
/// - Функцийг [FuncKeyboard]-ээр бичнэ (системийн гар гарахгүй), олон мөр.
/// - Хоёр хуруугаар томруулж, нэгээр чирнэ; муруй дээр хүрвэл утга, онцгой цэг дээр
///   хүрвэл (тэг, экстремум, огтлолцол) тодорно — доорх жагсаалтаас ч мөн.
/// - Параметр (a, b, k …)-ийг гулсуураар өөрчилнө. Тохиргоо нуугдмал.
/// - Зураг [CustomPainter] + [RepaintBoundary]: чирэх үед зөвхөн зураг дахин зурагдана.
class GraphScreen extends StatefulWidget {
  const GraphScreen({super.key, this.initial = const ['x^2-4x+3']});

  /// Эхний мөрүүд (Бодогчоос «Графикт харах» дамжуулна).
  final List<String> initial;

  @override
  State<GraphScreen> createState() => _GraphScreenState();
}

class _Line {
  _Line(this.id, String src, this.ci) : ctl = FuncInputController(src);
  final int id;
  final FuncInputController ctl;
  final int ci;
  bool on = true;
  GraphItem item = const GraphItem.empty();
}

class _GraphScreenState extends State<GraphScreen> with SingleTickerProviderStateMixin {
  final _lines = <_Line>[];
  int _nextId = 1;
  final _view = ValueNotifier(const GView(cx: 0, cy: 0, sx: 50, sy: 50, w: 0, h: 0));
  bool _grid = true;
  bool _special = true;
  bool _pi = false;
  bool _deg = false;
  bool _table = false;
  bool _settings = false;
  final _params = <String, double>{};

  /// Хөдөлгөөнт параметр (вэбийн «Хөдөлгөөнт болгох»): -5..5 хооронд 2 нэгж/сек-ээр нааш цааш.
  String? _anim;
  double _animDir = 1;
  Duration _animLast = Duration.zero;
  Ticker? _animTicker;
  int? _editing;
  int? _focus;
  (int, double)? _trace;
  bool _interacting = false;
  List<Special> _specials = const [];
  bool _tangent = false;
  bool _area = false;
  double _areaA = 0;
  double _areaB = 2;

  // Тоон талбарын засвар (x/y муж, интегралын a, b) — функцийн гараар бичнэ.
  _NumTarget? _numEdit;
  FuncInputController? _numCtl;
  ScrollController _panelScroll = ScrollController();
  double _savedOffset = 0;

  // Чирэх/томруулах эхлэл
  GView? _startView;
  Offset _startFocal = Offset.zero;

  @override
  void initState() {
    super.initState();
    for (final s in widget.initial) {
      _addLine(s, edit: false);
    }
    if (_lines.isEmpty) _addLine('', edit: false);
  }

  void _toggleAnim(String p) {
    _animTicker ??= createTicker(_onAnimTick);
    setState(() {
      if (_anim == p) {
        _anim = null;
        _animTicker!.stop();
        _recompute();
      } else {
        _anim = p;
        _animDir = 1;
        _animLast = Duration.zero;
        if (!_animTicker!.isActive) _animTicker!.start();
      }
    });
  }

  void _onAnimTick(Duration elapsed) {
    final p = _anim;
    if (p == null || !mounted) return;
    final dt = math.min(0.1, (elapsed - _animLast).inMicroseconds / 1e6);
    _animLast = elapsed;
    var v = (_params[p] ?? 1) + _animDir * 2 * dt;
    if (v > 5) {
      v = 5;
      _animDir = -1;
    } else if (v < -5) {
      v = -5;
      _animDir = 1;
    }
    setState(() {
      _params[p] = (v * 100).roundToDouble() / 100;
      _trace = null;
    });
  }

  @override
  void dispose() {
    _animTicker?.dispose();
    for (final l in _lines) {
      l.ctl.dispose();
    }
    _view.dispose();
    _numCtl?.dispose();
    _panelScroll.dispose();
    super.dispose();
  }

  /* ---------- Тоон талбар ---------- */

  double _numValue(_NumTarget t) {
    final v = _view.value;
    return switch (t) {
      _NumTarget.xMin => v.xMin,
      _NumTarget.xMax => v.xMax,
      _NumTarget.yMin => v.yMin,
      _NumTarget.yMax => v.yMax,
      _NumTarget.areaA => _areaA,
      _NumTarget.areaB => _areaB,
    };
  }

  void _openNum(_NumTarget t) {
    if (_panelScroll.hasClients) _savedOffset = _panelScroll.offset;
    _numCtl?.dispose();
    final ctl = FuncInputController(_plainNum(_numValue(t)));
    ctl.addListener(() => _applyNum(t, ctl));
    setState(() {
      _editing = null;
      _numEdit = t;
      _numCtl = ctl;
    });
  }

  void _closeNum() {
    _panelScroll.dispose();
    _panelScroll = ScrollController(initialScrollOffset: _savedOffset);
    setState(() => _numEdit = null);
  }

  /// Бичсэн илэрхийллийн утга; хүчингүй бол алдааны мессеж.
  String? _numError(_NumTarget t, FuncInputController ctl) {
    if (ctl.isEmpty) return 'Тоо бичнэ үү';
    final x = evaluate(ctl.text);
    if (x == null || !x.isFinite) return 'Тоо биш байна';
    if (t.isRange && x.abs() > 1e6) return 'Утга хэт том байна';
    if (t.isRange) {
      final v = _view.value;
      final r = _rangeWith(t, x, v);
      if (r.$2 <= r.$1) return 'Дээд утга доод утгаасаа их байх ёстой';
    }
    return null;
  }

  /// (min, max) — [t] тэнхлэгийн шинэ муж.
  (double, double) _rangeWith(_NumTarget t, double x, GView v) => switch (t) {
    _NumTarget.xMin => (x, v.xMax),
    _NumTarget.xMax => (v.xMin, x),
    _NumTarget.yMin => (x, v.yMax),
    _ => (v.yMin, x),
  };

  void _applyNum(_NumTarget t, FuncInputController ctl) {
    if (_numError(t, ctl) != null) {
      setState(() {});
      return;
    }
    final x = evaluate(ctl.text)!;
    setState(() {
      final v = _view.value;
      switch (t) {
        case _NumTarget.areaA:
          _areaA = x;
        case _NumTarget.areaB:
          _areaB = x;
        default:
          final r = _rangeWith(t, x, v);
          _view.value = t.isX
              ? GView.fromRange(r.$1, r.$2, v.yMin, v.yMax, v.w, v.h)
              : GView.fromRange(v.xMin, v.xMax, r.$1, r.$2, v.w, v.h);
          _trace = null;
          _focus = null;
          _recompute();
      }
    });
  }

  void _addLine(String src, {bool edit = true}) {
    final used = _lines.map((l) => l.ci).toSet();
    var ci = 0;
    while (used.contains(ci) && ci < 6) {
      ci++;
    }
    final l = _Line(_nextId++, src, ci % 6);
    l.ctl.addListener(() => _onEdit(l));
    _lines.add(l);
    _analyze(l);
    if (edit) _editing = _lines.length - 1;
    _recompute();
  }

  void _onEdit(_Line l) {
    setState(() {
      _analyze(l);
      _trace = null;
      _focus = null;
      _recompute();
    });
  }

  void _analyze(_Line l) {
    l.item = analyzeGraph(l.ctl.text, degrees: _deg);
    for (final p in l.item.params) {
      _params.putIfAbsent(p, () => 1);
    }
  }

  void _remove(int i) {
    setState(() {
      _lines.removeAt(i).ctl.dispose();
      _editing = null;
      _focus = null;
      _trace = null;
      _recompute();
    });
  }

  void _closeEditor() {
    setState(() {
      final i = _editing;
      _editing = null;
      if (i != null && i < _lines.length && _lines[i].ctl.isEmpty && _lines.length > 1) {
        _lines.removeAt(i).ctl.dispose();
      }
      _recompute();
    });
  }

  List<String> get _usedParams {
    final s = <String>{};
    for (final l in _lines) {
      if (l.on) s.addAll(l.item.params);
    }
    return s.toList()..sort();
  }

  Scope _scope() => {for (final p in _usedParams) p: _params[p] ?? 1};

  /// Цуврал өнгө (дизайны токеноос): хар хөх, улаан, ногоон, цэнхэр, улбар шар, саарал.
  /// Өнгө нь зөвхөн муруйг ялгах утгатай (жагсаалтын тойрогтой тааруулна).
  Color _color(int ci, AppColors c, bool dark) =>
      [dark ? c.brandBright : c.brand, c.error, c.success, c.info, c.warning, c.inkDim][ci % 6];

  List<FnLine> get _fnLines => [
    for (var i = 0; i < _lines.length; i++)
      if (_lines[i].on && _lines[i].item.kind == ItemKind.fn) FnLine(_lines[i].id, _lines[i].item.f!, _scope()),
  ];

  /// Онцгой цэгүүдийг дахин тооцох (засвар, гулсуур, харагдал тогтсоны дараа — чирэх үед биш).
  void _recompute() {
    final v = _view.value;
    if (!_special || v.w <= 0) {
      _specials = const [];
      return;
    }
    _specials = specialPoints(_fnLines, v.xMin, v.xMax);
  }

  void _resetView() {
    final v = _view.value;
    _view.value = GView(cx: 0, cy: 0, sx: 50, sy: 50, w: v.w, h: v.h);
    setState(_recompute);
  }

  void _zoomBy(double f) {
    final v = _view.value;
    _view.value = v.zoomAbout(v.w / 2, v.h / 2, f);
    setState(_recompute);
  }

  /* ---------- Хүрэлт ---------- */

  void _onScaleStart(ScaleStartDetails d) {
    _startView = _view.value;
    _startFocal = d.localFocalPoint;
    setState(() => _interacting = true);
  }

  void _onScaleUpdate(ScaleUpdateDetails d) {
    final s = _startView;
    if (s == null) return;
    final delta = d.localFocalPoint - _startFocal;
    var v = s.panBy(delta.dx, delta.dy);
    if (d.pointerCount > 1 && d.scale > 0) {
      v = v.zoomAbout(d.localFocalPoint.dx, d.localFocalPoint.dy, d.scale);
    }
    _view.value = v;
  }

  void _onScaleEnd(ScaleEndDetails d) {
    _startView = null;
    setState(() {
      _interacting = false;
      _recompute();
    });
  }

  void _onTap(TapUpDetails d) {
    final v = _view.value;
    final p = d.localPosition;
    // 1. Онцгой цэг
    if (_special) {
      int? best;
      var bestD = 26.0;
      for (var i = 0; i < _specials.length; i++) {
        final s = _specials[i];
        final dd = (Offset(v.pxOf(s.x), v.pyOf(s.y)) - p).distance;
        if (dd < bestD) {
          bestD = dd;
          best = i;
        }
      }
      if (best != null) {
        setState(() {
          _focus = _focus == best ? null : best;
          _trace = null;
        });
        return;
      }
    }
    // 2. Муруй
    final x = v.xOf(p.dx);
    final scope = _scope();
    (int, double)? hit;
    var bestD = 28.0;
    for (final l in _lines) {
      if (!l.on || l.item.kind != ItemKind.fn) continue;
      scope['x'] = x;
      final y = l.item.f!(scope);
      if (!y.isFinite) continue;
      final dd = (v.pyOf(y) - p.dy).abs();
      if (dd < bestD) {
        bestD = dd;
        hit = (l.id, x);
      }
    }
    setState(() {
      _trace = hit;
      _focus = null;
    });
  }

  /* ---------- Шүргэгч, талбай (эхний харагдаж буй функцээр) ---------- */

  ({int idx, double x0, double y0, double k, double b})? _tangentOf(_Line? first, Scope scope) {
    if (!_tangent || first == null) return null;
    final x0 = _trace?.$2 ?? 1;
    final sc = Map.of(scope)..['x'] = x0;
    final f = first.item.f!;
    final y0 = f(sc);
    final k = derivAt(f, Map.of(sc), x0);
    if (!y0.isFinite || !k.isFinite) return null;
    return (idx: first.id, x0: x0, y0: y0, k: k, b: y0 - k * x0);
  }

  double? _areaValue(_Line? first, Scope scope) =>
      !_area || first == null ? null : simpson(first.item.f!, Map.of(scope), _areaA, _areaB);

  /* ---------- Зураг ---------- */

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final dark = Theme.of(context).brightness == Brightness.dark;
    final scope = _scope();
    final plot = [
      for (final l in _lines)
        if (l.on && l.item.kind != ItemKind.empty && l.item.kind != ItemKind.error)
          PlotLine(idx: l.id, item: l.item, color: _color(l.ci, c, dark), scope: Map.of(scope)),
    ];
    final first = _lines.where((l) => l.on && l.item.kind == ItemKind.fn).firstOrNull;
    final tan = _tangentOf(first, scope);
    final areaVal = _areaValue(first, scope);
    final areaScene = first != null && areaVal != null && areaVal.isFinite ? (idx: first.id, a: _areaA, b: _areaB) : null;
    final scene = GraphScene(
      lines: plot,
      grid: _grid,
      piAxis: _pi,
      degrees: _deg,
      specials: _specials,
      showSpecials: _special && !_interacting,
      focus: _focus,
      trace: _trace,
      lowRes: _interacting,
      tangent: tan,
      area: areaScene,
    );
    final editing = _editing != null && _editing! < _lines.length ? _lines[_editing!] : null;
    final numTarget = editing == null ? _numEdit : null;

    return Scaffold(
      appBar: AppBar(
        leading: const ToolsBackButton(),
        title: const Text('График'),
        actions: [
          IconButton(
            key: const ValueKey('graph-reset'),
            tooltip: 'Анхны харагдац',
            icon: const Icon(LucideIcons.locateFixed),
            onPressed: _resetView,
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              flex: 11,
              child: Stack(
                children: [
                  Positioned.fill(
                    child: LayoutBuilder(
                      builder: (context, box) {
                        final v = _view.value;
                        if (v.w != box.maxWidth || v.h != box.maxHeight) {
                          final first = v.w == 0;
                          _view.value = v.resized(box.maxWidth, box.maxHeight);
                          if (first) {
                            WidgetsBinding.instance.addPostFrameCallback((_) {
                              if (mounted) setState(_recompute);
                            });
                          }
                        }
                        return Semantics(
                          label: 'Функцийн график',
                          image: true,
                          child: GestureDetector(
                            key: const ValueKey('graph-canvas'),
                            onScaleStart: _onScaleStart,
                            onScaleUpdate: _onScaleUpdate,
                            onScaleEnd: _onScaleEnd,
                            onTapUp: _onTap,
                            child: RepaintBoundary(
                              child: CustomPaint(
                                size: Size(box.maxWidth, box.maxHeight),
                                painter: GraphPainter(view: _view, scene: scene, colors: c),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  Positioned(
                    right: AppSpace.sm,
                    top: AppSpace.sm,
                    child: Column(
                      children: [
                        _ZoomButton(icon: LucideIcons.plus, label: 'Томруулах', onTap: () => _zoomBy(1.4)),
                        const SizedBox(height: AppSpace.xs),
                        _ZoomButton(icon: LucideIcons.minus, label: 'Жижгэрүүлэх', onTap: () => _zoomBy(1 / 1.4)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            Container(height: 1, color: c.line),
            if (editing != null) ...[
              _EditorRow(line: editing, color: _color(editing.ci, c, dark)),
              FuncKeyboard(controller: editing.ctl, onDone: _closeEditor),
            ] else if (numTarget != null && _numCtl != null) ...[
              _NumEditorRow(target: numTarget, ctl: _numCtl!, error: _numError(numTarget, _numCtl!)),
              FuncKeyboard(controller: _numCtl!, onDone: _closeNum),
            ] else
              Expanded(flex: 9, child: _panel(context, c, dark, first, tan, areaVal)),
          ],
        ),
      ),
    );
  }

  Widget _panel(
    BuildContext context,
    AppColors c,
    bool dark,
    _Line? firstFn,
    ({int idx, double x0, double y0, double k, double b})? tan,
    double? areaVal,
  ) {
    final params = _usedParams;
    return ListView(
      key: const ValueKey('graph-panel'),
      controller: _panelScroll,
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xl),
      children: [
        for (var i = 0; i < _lines.length; i++) ...[
          _LineRow(
            key: ValueKey('graph-line-$i'),
            line: _lines[i],
            color: _color(_lines[i].ci, c, dark),
            onEdit: () => setState(() {
              _numEdit = null;
              _editing = i;
            }),
            onToggle: () => setState(() {
              _lines[i].on = !_lines[i].on;
              _trace = null;
              _focus = null;
              _recompute();
            }),
            onRemove: _lines.length > 1 ? () => _remove(i) : null,
          ),
          const SizedBox(height: AppSpace.sm),
        ],
        if (_lines.length < 6)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton.icon(
              key: const ValueKey('graph-add'),
              onPressed: () => setState(() => _addLine('')),
              icon: const Icon(LucideIcons.plus, size: 18),
              label: const Text('Функц нэмэх'),
            ),
          ),
        if (params.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          const _SectionTitle('Параметр'),
          for (final p in params) _ParamSlider(
            name: p,
            value: _params[p] ?? 1,
            animating: _anim == p,
            onToggleAnim: AppMotion.reduced(context) ? null : () => _toggleAnim(p),
            onChanged: (v) => setState(() {
              _params[p] = v;
              _trace = null;
            }),
            onChangeEnd: (_) => setState(() {
              _focus = null;
              _recompute();
            }),
          ),
        ],
        if (_special && _specials.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          const _SectionTitle('Онцгой цэгүүд'),
          for (var i = 0; i < _specials.length && i < 24; i++)
            _SpecialRow(
              key: ValueKey('graph-special-$i'),
              special: _specials[i],
              color: _color(_lines.firstWhere((l) => l.id == _specials[i].line, orElse: () => _lines.first).ci, c, dark),
              selected: _focus == i,
              onTap: () => setState(() {
                _focus = _focus == i ? null : i;
                _trace = null;
              }),
            ),
        ],
        if (_table && firstFn != null) ...[
          const SizedBox(height: AppSpace.md),
          const _SectionTitle('Утгын хүснэгт'),
          _ValueTable(rows: valueTable(firstFn.item.f!, _scope(), -3, 1, 7)),
        ],
        const SizedBox(height: AppSpace.md),
        const _SectionTitle('Шүргэгч, интеграл'),
        if (firstFn == null)
          Text('Эхлээд y=f(x) хэлбэрийн функц нэм', style: TextStyle(fontSize: 14, color: c.inkDim))
        else ...[
          _Toggle(
            label: 'Шүргэгч',
            value: _tangent,
            onChanged: (v) => setState(() => _tangent = v),
          ),
          if (_tangent)
            tan == null
                ? Text('Энэ цэгт шүргэгч тодорхойлогдохгүй', style: TextStyle(fontSize: 14, color: c.inkDim))
                : Column(
                    key: const ValueKey('graph-tangent-info'),
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Муруй дээр хүрч цэгээ сонгоно', style: TextStyle(fontSize: 13, color: c.inkDim)),
                      const SizedBox(height: AppSpace.xs),
                      MathText(
                        "\$x_0=${niceTex(tan.x0)},\\quad k=f'(x_0)=${niceTex(tan.k)}\$",
                        style: TextStyle(fontSize: 16, color: c.ink),
                      ),
                      const SizedBox(height: AppSpace.xs),
                      MathText('\$y=${lineTex(tan.k, tan.b)}\$', style: TextStyle(fontSize: 18, color: c.ink)),
                    ],
                  ),
          _Toggle(label: 'Интеграл, талбай', value: _area, onChanged: (v) => setState(() => _area = v)),
          if (_area) ...[
            const SizedBox(height: AppSpace.xs),
            Row(
              children: [
                Expanded(child: _NumField(key: const ValueKey('graph-num-areaA'), tex: 'a', value: _areaA, onTap: () => _openNum(_NumTarget.areaA))),
                const SizedBox(width: AppSpace.sm),
                Expanded(child: _NumField(key: const ValueKey('graph-num-areaB'), tex: 'b', value: _areaB, onTap: () => _openNum(_NumTarget.areaB))),
              ],
            ),
            const SizedBox(height: AppSpace.xs),
            if (areaVal != null && areaVal.isFinite)
              Padding(
                key: const ValueKey('graph-area-info'),
                padding: const EdgeInsets.only(top: AppSpace.xs),
                child: MathText(
                  '\$\\int_{${niceTex(_areaA)}}^{${niceTex(_areaB)}} f(x)\\,dx${approxTex(areaVal)}\$',
                  style: TextStyle(fontSize: 18, color: c.ink),
                ),
              )
            else
              Text(
                'Энэ завсарт функц тасралттай тул интеграл тодорхойлогдохгүй',
                style: TextStyle(fontSize: 14, color: c.inkDim),
              ),
          ],
        ],
        const SizedBox(height: AppSpace.md),
        _SettingsCard(
          open: _settings,
          onToggle: () => setState(() => _settings = !_settings),
          children: [
            _Toggle(label: 'Тор', value: _grid, onChanged: (v) => setState(() => _grid = v)),
            _Toggle(
              label: 'Онцгой цэг',
              value: _special,
              onChanged: (v) => setState(() {
                _special = v;
                _focus = null;
                _recompute();
              }),
            ),
            _Toggle(
              labelTex: r'x\text{ тэнхлэгт }\pi',
              label: 'Пи тэнхлэг',
              value: _pi,
              onChanged: (v) => setState(() => _pi = v),
            ),
            _Toggle(
              label: 'Градус',
              value: _deg,
              onChanged: (v) => setState(() {
                _deg = v;
                for (final l in _lines) {
                  _analyze(l);
                }
                _recompute();
              }),
            ),
            _Toggle(label: 'Утгын хүснэгт', value: _table, onChanged: (v) => setState(() => _table = v)),
            const SizedBox(height: AppSpace.sm),
            ValueListenableBuilder(
              valueListenable: _view,
              builder: (context, v, _) => Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: _NumField(key: const ValueKey('graph-num-xMin'), tex: r'x_{\min}', value: v.xMin, onTap: () => _openNum(_NumTarget.xMin))),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(child: _NumField(key: const ValueKey('graph-num-xMax'), tex: r'x_{\max}', value: v.xMax, onTap: () => _openNum(_NumTarget.xMax))),
                    ],
                  ),
                  const SizedBox(height: AppSpace.sm),
                  Row(
                    children: [
                      Expanded(child: _NumField(key: const ValueKey('graph-num-yMin'), tex: r'y_{\min}', value: v.yMin, onTap: () => _openNum(_NumTarget.yMin))),
                      const SizedBox(width: AppSpace.sm),
                      Expanded(child: _NumField(key: const ValueKey('graph-num-yMax'), tex: r'y_{\max}', value: v.yMax, onTap: () => _openNum(_NumTarget.yMax))),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

enum _NumTarget {
  xMin,
  xMax,
  yMin,
  yMax,
  areaA,
  areaB;

  bool get isRange => index < 4;
  bool get isX => this == xMin || this == xMax;

  String get tex => switch (this) {
    xMin => r'x_{\min}',
    xMax => r'x_{\max}',
    yMin => r'y_{\min}',
    yMax => r'y_{\max}',
    areaA => 'a',
    areaB => 'b',
  };
}

/// Засварт өгөх энгийн аравтын тоо (илүү тэг, экспонентгүй).
String _plainNum(double v) {
  var s = v.toStringAsFixed(4);
  if (s.contains('.')) s = s.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
  return s == '-0' ? '0' : s;
}

/// 2 оронтой LaTeX тоо.
String _r2(double v) {
  final r = (v * 100).roundToDouble() / 100;
  return r == r.roundToDouble() ? r.toInt().toString() : r.toString();
}

String _numTex(double v) => shortNum(v).replaceAll('\u2212', '-');

class _ZoomButton extends StatelessWidget {
  const _ZoomButton({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Material(
      color: c.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        side: BorderSide(color: c.line),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.sm),
        onTap: onTap,
        child: Tooltip(
          message: label,
          child: SizedBox(width: 44, height: 44, child: Icon(icon, size: 20, color: c.ink)),
        ),
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.text);
  final String text;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: AppSpace.xs),
    child: Text(text, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: context.colors.inkDim)),
  );
}

/// Мөрийн өнгийг илэрхийлэх тойрог (утгатай өнгө — муруйтай тааруулна).
class _Swatch extends StatelessWidget {
  const _Swatch({required this.color, this.on = true});
  final Color color;
  final bool on;

  @override
  Widget build(BuildContext context) => Container(
    width: 14,
    height: 14,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: on ? color : null,
      border: Border.all(color: color, width: 2),
    ),
  );
}

class _LineRow extends StatelessWidget {
  const _LineRow({
    super.key,
    required this.line,
    required this.color,
    required this.onEdit,
    required this.onToggle,
    this.onRemove,
  });

  final _Line line;
  final Color color;
  final VoidCallback onEdit;
  final VoidCallback onToggle;
  final VoidCallback? onRemove;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final item = line.item;
    final tex = item.kind == ItemKind.empty || item.kind == ItemKind.error ? previewTex(line.ctl.text) : item.tex;
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: item.kind == ItemKind.error ? c.error : c.line),
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: line.on ? 'Муруйг нуух' : 'Муруйг харуулах',
            onPressed: onToggle,
            icon: _Swatch(color: color, on: line.on),
          ),
          Expanded(
            child: InkWell(
              onTap: onEdit,
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: AppSpace.sm),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (tex.isEmpty)
                      Text('Функц бичих', style: TextStyle(fontSize: 15, color: c.inkDim))
                    else
                      FittedBox(
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: MathText('\$$tex\$', style: TextStyle(fontSize: 18, color: c.ink)),
                      ),
                    if (item.kind == ItemKind.error)
                      Padding(
                        padding: const EdgeInsets.only(top: 2),
                        child: Text(item.message, style: TextStyle(fontSize: 12, color: c.error)),
                      ),
                  ],
                ),
              ),
            ),
          ),
          if (onRemove != null)
            IconButton(
              tooltip: 'Устгах',
              onPressed: onRemove,
              icon: Icon(LucideIcons.trash2, size: 18, color: c.inkDim),
            ),
        ],
      ),
    );
  }
}

/// Гарны дээрх бичиж буй мөр: LaTeX урьдчилан харагдац + курсор.
class _EditorRow extends StatelessWidget {
  const _EditorRow({required this.line, required this.color});
  final _Line line;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListenableBuilder(
      listenable: line.ctl,
      builder: (context, _) {
        final tex = previewTex(line.ctl.text);
        final err = line.item.kind == ItemKind.error && !RegExp(r'[+\-*/^(_=<>,|]$').hasMatch(line.ctl.text)
            ? line.item.message
            : null;
        return Container(
          key: const ValueKey('graph-editor'),
          color: c.surface,
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(color: err != null ? c.error : c.brandBright, width: 2),
                ),
                child: Row(
                  children: [
                    _Swatch(color: color),
                    const SizedBox(width: AppSpace.sm),
                    Flexible(
                      child: tex.isEmpty
                          ? Text('Жишээ: x^2-1', style: TextStyle(fontSize: 14, color: c.inkDim))
                          : FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: MathText('\$$tex\$', style: TextStyle(fontSize: 19, color: c.ink)),
                            ),
                    ),
                    Container(width: 2, height: 22, margin: const EdgeInsets.only(left: 2), color: c.brandBright),
                  ],
                ),
              ),
              if (err != null)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpace.xs),
                  child: Text(err, style: TextStyle(fontSize: 12, color: c.error)),
                ),
            ],
          ),
        );
      },
    );
  }
}

class _ParamSlider extends StatelessWidget {
  const _ParamSlider({
    required this.name,
    required this.value,
    required this.onChanged,
    required this.onChangeEnd,
    this.animating = false,
    this.onToggleAnim,
  });
  final String name;
  final double value;
  final bool animating;

  /// null = хөдөлгөөн багасгах тохиргоотой.
  final VoidCallback? onToggleAnim;
  final ValueChanged<double> onChanged;
  final ValueChanged<double> onChangeEnd;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final r = math.max(10, (value.abs() / 10).ceil() * 10).toDouble();
    return Row(
      key: ValueKey('graph-param-$name'),
      children: [
        SizedBox(
          width: 86,
          child: FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: MathText('\$$name = ${_numTex(value)}\$', style: TextStyle(fontSize: 17, color: c.ink)),
          ),
        ),
        Expanded(
          child: Slider(
            value: value.clamp(-r, r),
            min: -r,
            max: r,
            divisions: (r * 20).round(),
            semanticFormatterCallback: (v) => '$name ${_numTex(v)}',
            onChanged: (v) => onChanged((v * 20).roundToDouble() / 20),
            onChangeEnd: onChangeEnd,
          ),
        ),
        IconButton(
          key: ValueKey('graph-anim-$name'),
          tooltip: animating ? 'Хөдөлгөөнийг зогсоох' : 'Хөдөлгөөнт болгох',
          onPressed: onToggleAnim,
          icon: Icon(animating ? LucideIcons.circleX : LucideIcons.play, size: 18),
        ),
      ],
    );
  }
}

class _SpecialRow extends StatelessWidget {
  const _SpecialRow({super.key, required this.special, required this.color, required this.selected, required this.onTap});
  final Special special;
  final Color color;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      selected: selected,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Container(
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            border: Border.all(color: selected ? c.brandBright : Colors.transparent, width: 1.5),
          ),
          child: Row(
            children: [
              _Swatch(color: color),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: Text(
                  specialKindLabel[special.kind]!,
                  style: TextStyle(fontSize: 14, color: c.ink, fontWeight: selected ? FontWeight.w600 : FontWeight.w400),
                ),
              ),
              MathText(
                '\$\\left(${_numTex(special.x)};\\ ${_numTex(special.y)}\\right)\$',
                style: TextStyle(fontSize: 15, color: c.ink),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ValueTable extends StatelessWidget {
  const _ValueTable({required this.rows});
  final List<({double x, double y})> rows;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget cell(String tex, {bool head = false}) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 6, horizontal: AppSpace.sm),
      child: MathText('\$$tex\$', style: TextStyle(fontSize: 15, color: head ? c.inkDim : c.ink)),
    );
    return Table(
      border: TableBorder.all(color: c.line),
      children: [
        TableRow(children: [cell('x', head: true), cell('y', head: true)]),
        for (final r in rows)
          TableRow(
            children: [
              cell(_numTex(r.x)),
              cell(r.y.isFinite ? _numTex(r.y) : r'\text{тодорхойгүй}'),
            ],
          ),
      ],
    );
  }
}

class _SettingsCard extends StatelessWidget {
  const _SettingsCard({required this.open, required this.onToggle, required this.children});
  final bool open;
  final VoidCallback onToggle;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: c.line),
      ),
      child: Column(
        children: [
          Semantics(
            button: true,
            expanded: open,
            child: InkWell(
              key: const ValueKey('graph-settings'),
              onTap: onToggle,
              child: Container(
                constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: Row(
                  children: [
                    Icon(LucideIcons.settings2, size: 18, color: c.inkDim),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Text('Тохиргоо', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: c.ink)),
                    ),
                    Icon(open ? LucideIcons.chevronUp : LucideIcons.chevronDown, size: 20, color: c.inkDim),
                  ],
                ),
              ),
            ),
          ),
          if (open)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.md, 0, AppSpace.md, AppSpace.md),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: children),
            ),
        ],
      ),
    );
  }
}

class _Toggle extends StatelessWidget {
  const _Toggle({required this.label, required this.value, required this.onChanged, this.labelTex});
  final String label;
  final String? labelTex;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return MergeSemantics(
      child: Row(
        children: [
          Expanded(
            child: labelTex != null
                ? Align(
                    alignment: Alignment.centerLeft,
                    child: MathText('\$$labelTex\$', style: TextStyle(fontSize: 15, color: c.ink)),
                  )
                : Text(label, style: TextStyle(fontSize: 15, color: c.ink)),
          ),
          Switch(key: ValueKey('graph-toggle-$label'), value: value, onChanged: onChanged),
        ],
      ),
    );
  }
}

/// Дарж гараар бичих тоон талбар (системийн гар гарахгүй).
class _NumField extends StatelessWidget {
  const _NumField({super.key, required this.tex, required this.value, required this.onTap});
  final String tex;
  final double value;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: 'Утга өөрчлөх',
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        child: Container(
          constraints: const BoxConstraints(minHeight: AppSizes.minTap),
          padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.sm),
            border: Border.all(color: c.line),
          ),
          child: Row(
            children: [
              MathText('\$$tex\$', style: TextStyle(fontSize: 16, color: c.inkDim)),
              const SizedBox(width: AppSpace.sm),
              Expanded(
                child: FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Text(_r2(value), style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: c.ink)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Гарны дээрх тоо бичиж буй мөр: LaTeX урьдчилан харагдац + алдаа.
class _NumEditorRow extends StatelessWidget {
  const _NumEditorRow({required this.target, required this.ctl, required this.error});
  final _NumTarget target;
  final FuncInputController ctl;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListenableBuilder(
      listenable: ctl,
      builder: (context, _) {
        final tex = previewTex(ctl.text);
        return Container(
          key: const ValueKey('graph-num-editor'),
          color: c.surface,
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                  border: Border.all(color: error != null ? c.error : c.brandBright, width: 2),
                ),
                child: Row(
                  children: [
                    MathText('\$${target.tex}=\$', style: TextStyle(fontSize: 17, color: c.inkDim)),
                    const SizedBox(width: AppSpace.sm),
                    Flexible(
                      child: tex.isEmpty
                          ? Text('Жишээ: -2', style: TextStyle(fontSize: 14, color: c.inkDim))
                          : FittedBox(
                              fit: BoxFit.scaleDown,
                              alignment: Alignment.centerLeft,
                              child: MathText('\$$tex\$', style: TextStyle(fontSize: 19, color: c.ink)),
                            ),
                    ),
                    Container(width: 2, height: 22, margin: const EdgeInsets.only(left: 2), color: c.brandBright),
                  ],
                ),
              ),
              if (error != null)
                Padding(
                  padding: const EdgeInsets.only(top: AppSpace.xs),
                  child: Text(error!, style: TextStyle(fontSize: 12, color: c.error)),
                ),
            ],
          ),
        );
      },
    );
  }
}
