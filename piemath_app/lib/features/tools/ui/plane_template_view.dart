import 'package:flutter/material.dart';

import '../../../shared/math_keyboard/math_keyboard_lib.dart';
import '../domain/shapes.dart';
import 'figure_painter.dart';
import 'param_state.dart';
import 'tool_widgets.dart';

/// Загвар горим: дүрс сонгоод утгаа гарнаас бичнэ, зураг ба тооцоо шууд шинэчлэгдэнэ.
class PlaneTemplateView extends StatefulWidget {
  const PlaneTemplateView({super.key});

  @override
  State<PlaneTemplateView> createState() => _PlaneTemplateViewState();
}

class _PlaneTemplateViewState extends State<PlaneTemplateView> {
  final _group = MathFieldGroup();
  late final ParamState _params = ParamState(_group);
  PlaneShape _shape = PlaneShape.triangle;
  TriMode _tri = TriMode.sss;
  TrapMode _trap = TrapMode.iso;
  TriExtras _extras = const TriExtras();

  @override
  void initState() {
    super.initState();
    _configure();
  }

  void _configure() {
    _params.configure('${_shape.name}/${_tri.name}/${_trap.name}', paramSpecs(_shape, tri: _tri, trap: _trap));
  }

  void _set({PlaneShape? shape, TriMode? tri, TrapMode? trap}) {
    setState(() {
      _shape = shape ?? _shape;
      _tri = tri ?? _tri;
      _trap = trap ?? _trap;
    });
    _configure();
  }

  TriExtras _toggle(TriExtras e, String k) => switch (k) {
    'height' => e.copyWith(height: !e.height),
    'median' => e.copyWith(median: !e.median),
    'bisector' => e.copyWith(bisector: !e.bisector),
    'incircle' => e.copyWith(incircle: !e.incircle),
    _ => e.copyWith(circumcircle: !e.circumcircle),
  };

  @override
  void dispose() {
    _params.dispose();
    _group.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = FigurePalette.of(context);
    return ListenableBuilder(
      listenable: _params,
      builder: (context, _) {
        final built = buildPlane(_shape, _params.values, tri: _tri, trap: _trap, extras: _extras);
        final header = Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            PillRow(
              children: [
                for (final s in PlaneShape.values)
                  ToolPill(
                    key: ValueKey('shape-${s.name}'),
                    label: s.label,
                    selected: s == _shape,
                    onTap: () => _set(shape: s),
                  ),
              ],
            ),
            if (_shape == PlaneShape.triangle)
              PillRow(
                children: [
                  for (final m in TriMode.values)
                    ToolPill(
                      label: m.label,
                      selected: m == _tri,
                      onTap: () => _set(tri: m),
                    ),
                ],
              ),
            if (_shape == PlaneShape.triangle || _shape == PlaneShape.right) ...[
              PillRow(
                children: [
                  for (final (k, label, on) in [
                    ('height', 'Өндөр', _extras.height),
                    ('median', 'Медиан', _extras.median),
                    ('bisector', 'Биссектрис', _extras.bisector),
                    ('incircle', 'Багтсан тойрог', _extras.incircle),
                    ('circumcircle', 'Багтаасан тойрог', _extras.circumcircle),
                  ])
                    ToolPill(
                      key: ValueKey('extra-$k'),
                      label: label,
                      selected: on,
                      onTap: () => setState(() => _extras = _toggle(_extras, k)),
                    ),
                ],
              ),
              if (_extras.usesVertex)
                PillRow(
                  children: [
                    for (final v in TriVertex.values)
                      ToolPill(
                        key: ValueKey('extra-from-${v.name}'),
                        label: v == TriVertex.all ? 'Бүх оройгоос' : '${v.label} оройгоос',
                        selected: v == _extras.from,
                        onTap: () => setState(() => _extras = _extras.copyWith(from: v)),
                      ),
                  ],
                ),
            ],
            if (_shape == PlaneShape.trapezoid)
              PillRow(
                children: [
                  for (final m in TrapMode.values)
                    ToolPill(
                      label: m.label,
                      selected: m == _trap,
                      onTap: () => _set(trap: m),
                    ),
                ],
              ),
          ],
        );
        return ToolWorkspace(
          group: _group,
          header: header,
          figure: built.ok
              ? Semantics(
                  label: '${_shape.label}-ийн зураг',
                  image: true,
                  child: CustomPaint(
                    key: const ValueKey('plane-figure'),
                    painter: FigurePainter(prims: built.prims, palette: palette),
                    size: Size.infinite,
                  ),
                )
              : FigureMessage(message: built.reason!, tex: built.reasonTex),
          fields: ParamFields(
            specs: _params.specs,
            controllers: _params.controllers,
            group: _group,
            invalid: _params.invalid,
          ),
          results: built.ok ? ResultsList(metrics: built.metrics) : const SizedBox.shrink(),
        );
      },
    );
  }
}
