import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/ui/ui.dart';
import '../../../shared/math_keyboard/math_keyboard_lib.dart';
import '../domain/projection.dart';
import '../domain/solids.dart';
import 'figure_painter.dart';
import 'param_state.dart';
import 'solid_painter.dart';
import 'tool_widgets.dart';
import 'tools_back.dart';

/// Огторгуйн биет: биет сонгох, хэмжээг гарнаас бичих, зураг дээр чирж эргүүлэх.
class SolidScreen extends StatefulWidget {
  const SolidScreen({super.key});

  @override
  State<SolidScreen> createState() => _SolidScreenState();
}

class _SolidScreenState extends State<SolidScreen> {
  final _group = MathFieldGroup();
  late final ParamState _params = ParamState(_group);
  final _view = ValueNotifier(const View3());
  SolidKind _kind = SolidKind.cube;

  @override
  void initState() {
    super.initState();
    _params.configure(_kind.name, solidParams(_kind));
  }

  void _select(SolidKind k) {
    setState(() => _kind = k);
    _params.configure(k.name, solidParams(k));
  }

  @override
  void dispose() {
    _params.dispose();
    _group.dispose();
    _view.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final palette = FigurePalette.of(context);
    final colors = context.colors;
    return Scaffold(
      appBar: AppBar(leading: const ToolsBackButton(), title: const Text('Огторгуйн биет')),
      body: SafeArea(
        top: false,
        child: ListenableBuilder(
          listenable: _params,
          builder: (context, _) {
            final values = _params.values;
            final error = solidError(_kind, values);
            final header = PillRow(
              children: [
                for (final k in SolidKind.values)
                  ToolPill(
                    key: ValueKey('solid-${k.name}'),
                    label: k.label,
                    selected: k == _kind,
                    onTap: () => _select(k),
                  ),
              ],
            );
            final Widget figure;
            if (error != null) {
              figure = FigureMessage(message: error);
            } else {
              final model = buildSolid(_kind, values);
              figure = Stack(
                children: [
                  Positioned.fill(
                    child: Semantics(
                      label: '${_kind.label}-ийн зураг. Чирж эргүүлнэ',
                      image: true,
                      child: GestureDetector(
                        key: const ValueKey('solid-figure'),
                        behavior: HitTestBehavior.opaque,
                        onPanUpdate: (d) => _view.value = _view.value.rotate(d.delta.dx * 0.012, d.delta.dy * 0.008),
                        child: CustomPaint(
                          painter: SolidPainter(model: model, view: _view, palette: palette),
                          size: Size.infinite,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    right: 2,
                    top: 2,
                    child: IconButton(
                      tooltip: 'Анхны байрлал',
                      onPressed: () => _view.value = const View3(),
                      icon: Icon(LucideIcons.rotateCcw, size: 20, color: colors.inkDim),
                    ),
                  ),
                ],
              );
            }
            return ToolWorkspace(
              group: _group,
              header: header,
              figure: figure,
              fields: ParamFields(
                specs: _params.specs,
                controllers: _params.controllers,
                group: _group,
                invalid: _params.invalid,
              ),
              results: error == null ? ResultsList(metrics: solidMetrics(_kind, values)) : const SizedBox.shrink(),
            );
          },
        ),
      ),
    );
  }
}
