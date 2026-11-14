import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/ui/ui.dart';
import '../domain/free.dart';
import '../domain/geom.dart';
import 'figure_painter.dart';
import 'tool_widgets.dart';

/// Чөлөөт байгуулалтын төлөв + буцаах/давтах түүх.
class FreeController extends ChangeNotifier {
  FreeState _state = const FreeState();
  final _undo = <FreeState>[];
  final _redo = <FreeState>[];
  FreeMode _mode = FreeMode.segment;
  bool _grid = true;

  FreeState get state => _state;
  FreeMode get mode => _mode;
  bool get grid => _grid;
  bool get canUndo => _undo.isNotEmpty;
  bool get canRedo => _redo.isNotEmpty;

  set mode(FreeMode m) {
    if (m == _mode) return;
    _mode = m;
    _state = _state.copyWith(pending: () => null);
    notifyListeners();
  }

  set grid(bool v) {
    _grid = v;
    notifyListeners();
  }

  void _commit(FreeState next) {
    if (identical(next, _state)) return;
    _undo.add(_state);
    if (_undo.length > 100) _undo.removeAt(0);
    _redo.clear();
    _state = next;
    notifyListeners();
  }

  /// Математик координатад товшилт. [tol] — онох зай (математик нэгжээр).
  void tap(Pt p, double tol) {
    final g = _grid ? 1.0 : null;
    switch (_mode) {
      case FreeMode.point:
        _commit(tapPoint(_state, p, tol: tol, grid: g));
      case FreeMode.segment:
        _commit(tapSegment(_state, p, tol: tol, grid: g));
      case FreeMode.select:
        final hit = _state.hitTest(p, tol, tol * 0.7);
        _state = _state.copyWith(selected: () => hit);
        notifyListeners();
    }
  }

  int? _dragId;

  /// Сонгох горимд цэг чирэх эхлэл. Цэг онсон бол true.
  bool dragStart(Pt p, double tol) {
    if (_mode != FreeMode.select) return false;
    final id = _state.hitPoint(p, tol);
    if (id == null) return false;
    _dragId = id;
    _undo.add(_state);
    _redo.clear();
    _state = _state.copyWith(selected: () => (kind: FreeKind.point, id: id));
    notifyListeners();
    return true;
  }

  void dragUpdate(Pt p) {
    final id = _dragId;
    if (id == null) return;
    _state = _state.movePoint(id, _grid ? snap(p, 1) : p);
    notifyListeners();
  }

  void dragEnd() => _dragId = null;

  void deleteSelected() => _commit(_state.removeSelected());

  void clear() {
    if (_state.isEmpty) return;
    _commit(const FreeState());
  }

  void undo() {
    if (_undo.isEmpty) return;
    _redo.add(_state);
    _state = _undo.removeLast();
    notifyListeners();
  }

  void redo() {
    if (_redo.isEmpty) return;
    _undo.add(_state);
    _state = _redo.removeLast();
    notifyListeners();
  }
}

/// Чөлөөт горим: зураг дээр шууд товшиж байгуулна. Горимын мөр — Цэг / Шулуун / Сонгох.
class PlaneFreeView extends StatefulWidget {
  const PlaneFreeView({super.key, this.controller});

  /// Тестэд гаднаас өгч болно.
  final FreeController? controller;

  @override
  State<PlaneFreeView> createState() => _PlaneFreeViewState();
}

class _PlaneFreeViewState extends State<PlaneFreeView> {
  late final FreeController _c = widget.controller ?? FreeController();

  @override
  void dispose() {
    if (widget.controller == null) _c.dispose();
    super.dispose();
  }

  static String _hint(FreeController c) {
    final s = c.state;
    switch (c.mode) {
      case FreeMode.point:
        return 'Зураг дээр товшиж цэг тавина';
      case FreeMode.segment:
        if (s.pending != null) return 'Дараагийн цэгээ товш. Эхний цэгээ товшвол дүрс хаагдана';
        return 'Хоёр цэг дараалан товшвол шулуунаар холбоно';
      case FreeMode.select:
        return s.selected == null ? 'Цэг, хэрчим эсвэл дүрсийг товшиж сонгоно. Цэгийг чирж зөөнө' : '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final palette = FigurePalette.of(context);
    return ListenableBuilder(
      listenable: _c,
      builder: (context, _) {
        final s = _c.state;
        final metrics = freeMetrics(s);
        final hint = _hint(_c);
        return LayoutBuilder(
          builder: (context, box) {
            final tablet = box.maxWidth >= AppSizes.tabletBreakpoint;
            final canvas = Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.sm),
              child: Container(
                decoration: BoxDecoration(
                  color: colors.surface,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: colors.line),
                ),
                clipBehavior: Clip.antiAlias,
                child: Stack(
                  children: [
                    Positioned.fill(
                      child: RepaintBoundary(
                        child: _Canvas(controller: _c, palette: palette),
                      ),
                    ),
                  ],
                ),
              ),
            );
            final results = metrics.isEmpty
                ? Padding(
                    padding: const EdgeInsets.symmetric(vertical: AppSpace.lg),
                    child: Text(
                      'Хүрээ хаагдмагц шинэ дүрсийн талбай, периметр, өнцөг энд гарна',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: colors.inkDim, fontSize: 14),
                    ),
                  )
                : ResultsList(metrics: metrics);
            final bar = _ModeBar(controller: _c, hint: hint);
            if (tablet) {
              return Row(
                children: [
                  Expanded(
                    child: Column(
                      children: [
                        bar,
                        Expanded(child: canvas),
                      ],
                    ),
                  ),
                  Container(width: 1, color: colors.line),
                  SizedBox(
                    width: 380,
                    child: ListView(padding: const EdgeInsets.all(AppSpace.gutter), children: [results]),
                  ),
                ],
              );
            }
            final h = (box.maxHeight * 0.58).clamp(220.0, 600.0);
            // Зураг дээр чирэхэд хуудас гүйхгүй — гүйлгэх нь зөвхөн доод хэсэгт.
            return Column(
              children: [
                bar,
                SizedBox(height: h, child: canvas),
                Expanded(
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
                    children: [results],
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

class _ModeBar extends StatelessWidget {
  const _ModeBar({required this.controller, required this.hint});
  final FreeController controller;
  final String hint;

  @override
  Widget build(BuildContext context) {
    final c = controller;
    final colors = context.colors;
    Widget action(IconData icon, String label, VoidCallback? onTap, {Key? key}) => Tooltip(
      message: label,
      child: Semantics(
        button: true,
        label: label,
        child: IconButton(
          key: key,
          onPressed: onTap,
          icon: Icon(icon, size: 22),
          color: colors.ink,
          disabledColor: colors.inkDim.withValues(alpha: 0.35),
          constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
        ),
      ),
    );
    return Padding(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.sm, 0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.only(right: AppSpace.sm),
            child: Row(
              children: [
                for (final m in FreeMode.values) ...[
                  if (m != FreeMode.point) const SizedBox(width: AppSpace.sm),
                  Expanded(
                    child: ToolPill(
                      key: ValueKey('mode-${m.name}'),
                      label: m.label,
                      icon: switch (m) {
                        FreeMode.point => LucideIcons.dot,
                        FreeMode.segment => LucideIcons.minus,
                        FreeMode.select => LucideIcons.mousePointer2,
                      },
                      selected: c.mode == m,
                      onTap: () => c.mode = m,
                    ),
                  ),
                ],
              ],
            ),
          ),
          Row(
            children: [
              Expanded(
                child: Text(
                  hint,
                  key: const ValueKey('free-hint'),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: 13, color: colors.inkDim, height: 1.25),
                ),
              ),
              action(LucideIcons.undo2, 'Буцаах', c.canUndo ? c.undo : null, key: const ValueKey('free-undo')),
              action(LucideIcons.redo2, 'Давтах', c.canRedo ? c.redo : null, key: const ValueKey('free-redo')),
              PopupMenuButton<String>(
                key: const ValueKey('free-more'),
                tooltip: 'Бусад',
                icon: Icon(LucideIcons.ellipsisVertical, color: colors.ink),
                onSelected: (v) {
                  if (v == 'delete') c.deleteSelected();
                  if (v == 'grid') c.grid = !c.grid;
                  if (v == 'clear') c.clear();
                },
                itemBuilder: (_) => [
                  PopupMenuItem(
                    value: 'delete',
                    enabled: c.state.selected != null,
                    child: const Text('Сонгосныг устгах'),
                  ),
                  CheckedPopupMenuItem(value: 'grid', checked: c.grid, child: const Text('Торонд наалдах')),
                  PopupMenuItem(value: 'clear', enabled: !c.state.isEmpty, child: const Text('Бүгдийг арилгах')),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Canvas extends StatelessWidget {
  const _Canvas({required this.controller, required this.palette});
  final FreeController controller;
  final FigurePalette palette;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, box) {
        final s = math.min(box.maxWidth, box.maxHeight) / 9;
        final view = FigureView(s, box.maxWidth / 2, box.maxHeight / 2);
        final tol = 24 / s;
        final st = controller.state;
        return Semantics(
          label: 'Байгуулалтын талбар: ${st.points.length} цэг, ${st.segs.length} хэрчим',
          child: GestureDetector(
            key: const ValueKey('free-canvas'),
            behavior: HitTestBehavior.opaque,
            onTapUp: (d) => controller.tap(view.toMath(d.localPosition), tol),
            onPanStart: (d) => controller.dragStart(view.toMath(d.localPosition), tol),
            onPanUpdate: (d) => controller.dragUpdate(view.toMath(d.localPosition)),
            onPanEnd: (_) => controller.dragEnd(),
            child: CustomPaint(
              painter: FigurePainter(prims: freePrims(st), palette: palette, view: view, grid: 1),
              size: Size.infinite,
            ),
          ),
        );
      },
    );
  }
}
