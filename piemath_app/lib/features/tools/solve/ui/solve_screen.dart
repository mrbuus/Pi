import 'dart:async';

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/math/math.dart';
import '../../../../core/ui/ui.dart';
import '../../../../shared/solution/solution.dart';
import '../../graph/input/func_input.dart';
import '../../graph/input/func_keyboard.dart';
import '../../graph/ui/graph_screen.dart';
import '../../ui/tools_back.dart';
import '../data/solve_history.dart';
import '../domain/auto.dart';
import '../domain/display.dart';
import '../domain/live.dart';
import '../domain/solve.dart';
import '../domain/steps.dart';
import 'number_line.dart';

/// Бодогч (вэбийн `SolveTool`-ын апп хувилбар): нэг оруулга → төрлийг автоматаар
/// танина (тэгшитгэл, тэнцэтгэл биш, систем, илэрхийлэл, функц, тоо), бичих зуур
/// хариу гарна, бусад үйлдэл чипээр. Алхам алхмаар бодолт [SolutionView]-ээр.
///
/// Бүх бодолт төхөөрөмж дээр, урьдчилан бичсэн алгоритмаар — AI/LLM дуудахгүй.
class SolveScreen extends StatefulWidget {
  const SolveScreen({super.key, this.initial = ''});

  final String initial;

  @override
  State<SolveScreen> createState() => _SolveScreenState();
}

/// Оруулгын жишээ (апп-ын гарны ASCII бичлэгээр).
const solveExamples = <String>[
  'x^2-5x+6=0',
  '1/x+1/(x-1)=3/2',
  'x^2-3x+2<=0',
  '2x+y=5\nx-y=1',
  'sqrt(x+3)=x+1',
  '4^x-3*2^x+2=0',
  '2sin(x)^2-3sin(x)+1=0',
  'y=x^3-3x',
  'x^3-8',
  'sqrt(50)+sqrt(18)',
  '(2a-3b)^3',
];

const _seqSubs = <String, String>{
  'arith': 'Арифметик прогресс',
  'geom': 'Геометр прогресс',
  'comb': 'Хослол, сэлгэмэл',
  'prob': 'Сонгодог магадлал',
  'bern': 'Бернуллийн томьёо',
};

const _seqFields = <String, List<(String, String)>>{
  'arith': [('a1', 'a_1'), ('d', 'd'), ('n', 'n')],
  'geom': [('b1', 'b_1'), ('q', 'q'), ('n', 'n')],
  'comb': [('n', 'n'), ('k', 'k')],
  'prob': [('m', 'm'), ('n', 'n')],
  'bern': [('n', 'n'), ('k', 'k'), ('p', 'p')],
};

/// [Solution]-ийн алхмуудыг [SolutionView]-ийн эх бичвэр болгоно (дугаартай алхам, `$$…$$` мөр).
String solutionSource(Solution sol) {
  final b = StringBuffer();
  var n = 0;
  for (final s in sol.steps) {
    n++;
    final text = tidyTex(s.text ?? '');
    final tag = switch (s.tone) {
      Tone.bad => 'Гаднах язгуур: ',
      Tone.note => 'Анхаар: ',
      _ => '',
    };
    final lead = tag.isNotEmpty && !text.contains('гаднах') ? tag : '';
    b.writeln('$n. $lead$text');
    for (final t in s.tex ?? const <String>[]) {
      if (t.trim().isEmpty) continue;
      b.writeln('\$\$${tidyTex(t)}\$\$');
    }
    b.writeln();
  }
  return b.toString();
}

class _SolveScreenState extends State<SolveScreen> {
  late final _input = FuncInputController(widget.initial);
  final _params = {for (final k in const ['to', 'a', 'b', 'order', 'at']) k: FuncInputController()};
  final _seq = <String, FuncInputController>{};
  FuncInputController? _active;
  bool _deg = false;
  SolveAction? _action;
  Live _live = const Live(LiveStatus.empty);
  Timer? _timer;
  bool _otherOpen = false;
  String _seqSub = 'arith';
  Solution? _seqSol;
  final _history = ValueNotifier<List<SolveHistoryItem>>(const []);
  static const _store = SolveHistoryStore();

  @override
  void initState() {
    super.initState();
    _store.load().then((h) {
      // Хэрэглэгч хүлээх зуур бодсон бол түүний мөрийг алдахгүй.
      if (mounted) _history.value = [..._history.value, ...h.where((x) => !_history.value.any((y) => y.key == x.key))].take(solveHistoryMax).toList();
    });
    _input.addListener(_onInput);
    for (final c in _params.values) {
      c.addListener(_schedule);
    }
    if (widget.initial.isNotEmpty) {
      _run();
    } else {
      _active = _input;
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _history.dispose();
    _input.dispose();
    for (final c in [..._params.values, ..._seq.values]) {
      c.dispose();
    }
    super.dispose();
  }

  FuncInputController _seqCtl(String k) => _seq.putIfAbsent(k, FuncInputController.new);

  void _onInput() {
    _action = null;
    _schedule();
  }

  void _schedule() {
    setState(() {});
    _timer?.cancel();
    _timer = Timer(const Duration(milliseconds: 220), () {
      if (mounted) setState(_run);
    });
  }

  void _run() {
    _live = liveSolve(
      _input.text,
      degrees: _deg,
      action: _action,
      params: {for (final e in _params.entries) e.key: e.value.text},
    );
  }

  /* ---------- Түүх ---------- */

  void _push(SolveHistoryItem item) {
    _history.value = pushHistory(_history.value, item);
    _store.save(_history.value);
  }

  /// Амжилттай бодогдсон одоогийн хариуг түүхэнд хадгална (вэбийн `remember`).
  void _remember() {
    final sol = _live.sol;
    if (_live.status != LiveStatus.done || sol == null || !sol.ok) return;
    final act = _live.action ?? _live.analysis?.primary;
    _push(SolveHistoryItem(text: _input.text, action: act?.name, degrees: _deg, title: sol.title));
  }

  void _clearHistory() {
    _history.value = const [];
    _store.save(const []);
  }

  void _restore(SolveHistoryItem h) {
    _timer?.cancel();
    if (h.isSeq && _seqSubs.containsKey(h.seqSub)) {
      setState(() {
        _otherOpen = true;
        _active = null;
        _seqSub = h.seqSub!;
        for (final (k, _) in _seqFields[_seqSub]!) {
          _seqCtl(k).text = h.extra[k] ?? '';
        }
        _solveSeq();
      });
      return;
    }
    _deg = h.degrees;
    _input.text = h.text; // _onInput үйлдлийг null болгоно
    _timer?.cancel();
    setState(() {
      _action = SolveAction.values.where((a) => a.name == h.action).firstOrNull;
      _active = null;
      _run();
      _remember();
    });
  }

  Future<void> _openHistory() async {
    final picked = await showModalBottomSheet<SolveHistoryItem>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => _HistorySheet(history: _history, onClear: _clearHistory),
    );
    if (picked != null && mounted) _restore(picked);
  }

  void _focus(FuncInputController c) => setState(() => _active = c);

  void _done() {
    _timer?.cancel();
    setState(() {
      if (_seq.values.contains(_active)) _solveSeq();
      _active = null;
      _run();
      _remember();
    });
  }

  void _solveSeq() {
    _seqSol = solve(
      SolveRequest(
        mode: SolveMode.seq,
        sub: _seqSub,
        input: '',
        extra: {for (final (k, _) in _seqFields[_seqSub]!) k: _seqCtl(k).text},
      ),
    );
    if (_seqSol!.ok) {
      _push(
        SolveHistoryItem(
          seqSub: _seqSub,
          extra: {for (final (k, _) in _seqFields[_seqSub]!) k: _seqCtl(k).text},
          title: _seqSubs[_seqSub] ?? '',
        ),
      );
    }
  }

  void _openGraph(List<String> exprs) {
    final router = GoRouter.maybeOf(context);
    if (router != null) {
      router.push('/app/tools/graph', extra: exprs);
    } else {
      Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => GraphScreen(initial: exprs)));
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hasTrig = RegExp(r'sin|cos|tg|ctg').hasMatch(_input.text);
    return Scaffold(
      appBar: AppBar(
        leading: const ToolsBackButton(),
        title: const Text('Бодогч'),
        actions: [
          IconButton(
            key: const ValueKey('solve-history'),
            tooltip: 'Түүх',
            icon: const Icon(AppIcons.historyLog),
            onPressed: _openHistory,
          ),
        ],
      ),
      body: SafeArea(
        top: false,
        child: Column(
          children: [
            Expanded(
              child: ListView(
                key: const ValueKey('solve-list'),
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xl),
                children: [
                  _InputBox(
                    controller: _input,
                    active: _active == _input,
                    onTap: () => _focus(_input),
                    onClear: _input.isEmpty
                        ? null
                        : () {
                            _input.clear();
                            setState(() => _active = _input);
                          },
                  ),
                  if (hasTrig)
                    Padding(
                      padding: const EdgeInsets.only(top: AppSpace.xs),
                      child: Row(
                        children: [
                          Expanded(child: Text('Өнцгийг градусаар', style: TextStyle(fontSize: 14, color: c.inkDim))),
                          Switch(
                            key: const ValueKey('solve-degrees'),
                            value: _deg,
                            onChanged: (v) => setState(() {
                              _deg = v;
                              _run();
                            }),
                          ),
                        ],
                      ),
                    ),
                  ..._actionsAndParams(c),
                  const SizedBox(height: AppSpace.md),
                  _result(c),
                  const SizedBox(height: AppSpace.lg),
                  _other(c),
                ],
              ),
            ),
            if (_active != null)
              FuncKeyboard(
                controller: _active!,
                onDone: _done,
                allowNewline: _active == _input,
                doneLabel: _active == _input ? 'Бодох' : 'Болсон',
              ),
          ],
        ),
      ),
    );
  }

  List<Widget> _actionsAndParams(AppColors c) {
    final an = _live.analysis;
    if (an == null || an.actions.length < 2 && _live.status != LiveStatus.need) {
      return const [];
    }
    final cur = _live.action ?? an.primary;
    return [
      const SizedBox(height: AppSpace.sm),
      Wrap(
        spacing: AppSpace.sm,
        runSpacing: AppSpace.sm,
        children: [
          for (final a in an.actions)
            _Chip(
              key: ValueKey('solve-action-${a.name}'),
              label: actionLabel[a]!,
              selected: a == cur,
              onTap: () => setState(() {
                _action = a;
                _run();
                _remember();
              }),
            ),
        ],
      ),
      if (cur == SolveAction.lim) ...[
        const SizedBox(height: AppSpace.sm),
        Row(
          children: [
            MathText(r'$x\to$', style: TextStyle(fontSize: 18, color: c.ink)),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: _ParamField(tex: '', ctl: _params['to']!, active: _active, onTap: _focus)),
            const SizedBox(width: AppSpace.sm),
            for (final (v, t) in const [('0', '0'), ('inf', r'+\infty'), ('-inf', r'-\infty')]) ...[
              _Chip(
                label: '',
                tex: t,
                selected: _params['to']!.text == v,
                onTap: () => _params['to']!.text = v,
              ),
              const SizedBox(width: AppSpace.xs),
            ],
          ],
        ),
      ],
      if (cur == SolveAction.defint) ...[
        const SizedBox(height: AppSpace.sm),
        Row(
          children: [
            Expanded(child: _ParamField(tex: 'a', ctl: _params['a']!, active: _active, onTap: _focus, hint: 'доод')),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: _ParamField(tex: 'b', ctl: _params['b']!, active: _active, onTap: _focus, hint: 'дээд')),
          ],
        ),
      ],
      if (cur == SolveAction.deriv) ...[
        const SizedBox(height: AppSpace.sm),
        Row(
          children: [
            Expanded(child: _ParamField(tex: 'n', ctl: _params['order']!, active: _active, onTap: _focus, hint: 'эрэмбэ')),
            const SizedBox(width: AppSpace.sm),
            Expanded(child: _ParamField(tex: 'x_0', ctl: _params['at']!, active: _active, onTap: _focus, hint: 'цэг')),
          ],
        ),
      ],
    ];
  }

  Widget _result(AppColors c) {
    switch (_live.status) {
      case LiveStatus.empty:
        return _Examples(
          onPick: (s) {
            _input.text = s;
            _timer?.cancel();
            setState(() {
              _active = null;
              _run();
              _remember();
            });
          },
        );
      case LiveStatus.incomplete:
        return const SizedBox.shrink();
      case LiveStatus.error:
        return _Message(icon: AppIcons.info, text: _live.message ?? 'Оролтыг шалгана уу');
      case LiveStatus.implicit:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const _Message(icon: AppIcons.info, text: 'x, y хоёр хувьсагчтай муруй — графикаар харна уу'),
            const SizedBox(height: AppSpace.sm),
            _GraphButton(onTap: () => _openGraph(_live.analysis!.graph)),
          ],
        );
      case LiveStatus.need:
        final a = _live.action;
        return _Message(
          icon: AppIcons.info,
          text: a == SolveAction.lim
              ? r'$x$ хаашаа тэмүүлэхийг оруулна уу'
              : 'Интегралын доод ба дээд хязгаарыг оруулна уу',
        );
      case LiveStatus.done:
        return ResultView(
          key: const ValueKey('solve-result'),
          sol: _live.sol!,
          onGraph: (_live.sol!.graph ?? const []).isNotEmpty ? () => _openGraph(_live.sol!.graph!) : null,
        );
    }
  }

  Widget _other(AppColors c) {
    return Container(
      decoration: BoxDecoration(
        color: c.surface,
        borderRadius: BorderRadius.circular(AppRadius.sm),
        border: Border.all(color: c.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            button: true,
            expanded: _otherOpen,
            child: InkWell(
              key: const ValueKey('solve-other'),
              onTap: () => setState(() => _otherOpen = !_otherOpen),
              child: Container(
                constraints: const BoxConstraints(minHeight: AppSizes.minTap),
                padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
                child: Row(
                  children: [
                    Icon(LucideIcons.listOrdered, size: 18, color: c.inkDim),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Text(
                        'Бусад тооцоо: прогресс, магадлал',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600, color: c.ink),
                      ),
                    ),
                    Icon(_otherOpen ? LucideIcons.chevronUp : LucideIcons.chevronDown, size: 20, color: c.inkDim),
                  ],
                ),
              ),
            ),
          ),
          if (_otherOpen)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.md, 0, AppSpace.md, AppSpace.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Wrap(
                    spacing: AppSpace.sm,
                    runSpacing: AppSpace.sm,
                    children: [
                      for (final e in _seqSubs.entries)
                        _Chip(
                          key: ValueKey('solve-seq-${e.key}'),
                          label: e.value,
                          selected: _seqSub == e.key,
                          onTap: () => setState(() {
                            _seqSub = e.key;
                            _seqSol = null;
                          }),
                        ),
                    ],
                  ),
                  const SizedBox(height: AppSpace.md),
                  Row(
                    children: [
                      for (final (i, (k, tex)) in _seqFields[_seqSub]!.indexed) ...[
                        if (i > 0) const SizedBox(width: AppSpace.sm),
                        Expanded(child: _ParamField(tex: tex, ctl: _seqCtl(k), active: _active, onTap: _focus)),
                      ],
                    ],
                  ),
                  const SizedBox(height: AppSpace.sm),
                  FilledButton(
                    key: const ValueKey('solve-seq-run'),
                    onPressed: () => setState(() {
                      _solveSeq();
                      _active = null;
                    }),
                    child: const Text('Бодох'),
                  ),
                  if (_seqSol != null) ...[
                    const SizedBox(height: AppSpace.md),
                    ResultView(sol: _seqSol!),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/* ---------- Хэсгүүд ---------- */

class _InputBox extends StatelessWidget {
  const _InputBox({required this.controller, required this.active, required this.onTap, this.onClear});
  final FuncInputController controller;
  final bool active;
  final VoidCallback onTap;
  final VoidCallback? onClear;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lines = controller.lineTex;
    final empty = controller.isEmpty;
    return Semantics(
      textField: true,
      focused: active,
      label: 'Бодлого',
      value: controller.text,
      child: GestureDetector(
        key: const ValueKey('solve-input'),
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          constraints: const BoxConstraints(minHeight: 64),
          padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.sm, AppSpace.xs, AppSpace.sm),
          decoration: BoxDecoration(
            color: active ? c.surface : c.surfaceSunken,
            borderRadius: BorderRadius.circular(AppRadius.sm),
            border: Border.all(color: active ? c.brandBright : c.line, width: active ? 2 : 1),
          ),
          child: Row(
            children: [
              Expanded(
                child: empty
                    ? Text('Бодлогоо бичнэ үү', style: TextStyle(fontSize: 16, color: c.inkDim))
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          for (var i = 0; i < lines.length; i++)
                            Row(
                              children: [
                                Flexible(
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    alignment: Alignment.centerLeft,
                                    child: lines[i].isEmpty
                                        ? const SizedBox(height: 24)
                                        : MathText('\$${lines[i]}\$', style: TextStyle(fontSize: 21, color: c.ink)),
                                  ),
                                ),
                                if (active && i == lines.length - 1)
                                  Container(
                                    width: 2,
                                    height: 24,
                                    margin: const EdgeInsets.only(left: 2),
                                    color: c.brandBright,
                                  ),
                              ],
                            ),
                        ],
                      ),
              ),
              if (onClear != null)
                IconButton(
                  tooltip: 'Цэвэрлэх',
                  onPressed: onClear,
                  icon: Icon(AppIcons.close, size: 20, color: c.inkDim),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ParamField extends StatelessWidget {
  const _ParamField({required this.tex, required this.ctl, required this.active, required this.onTap, this.hint});
  final String tex;
  final FuncInputController ctl;
  final FuncInputController? active;
  final ValueChanged<FuncInputController> onTap;
  final String? hint;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final on = active == ctl;
    return ListenableBuilder(
      listenable: ctl,
      builder: (context, _) {
        final v = previewTex(ctl.text);
        return Semantics(
          textField: true,
          focused: on,
          label: hint ?? tex,
          value: ctl.text,
          child: GestureDetector(
            key: ValueKey('solve-param-$tex'),
            behavior: HitTestBehavior.opaque,
            onTap: () => onTap(ctl),
            child: Container(
              constraints: const BoxConstraints(minHeight: AppSizes.minTap),
              padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
              decoration: BoxDecoration(
                color: on ? c.surface : c.surfaceSunken,
                borderRadius: BorderRadius.circular(AppRadius.sm),
                border: Border.all(color: on ? c.brandBright : c.line, width: on ? 2 : 1),
              ),
              child: Row(
                children: [
                  if (tex.isNotEmpty) MathText('\$$tex=\$', style: TextStyle(fontSize: 16, color: c.inkDim)),
                  const SizedBox(width: AppSpace.xs),
                  Flexible(
                    child: v.isEmpty
                        ? Text(hint ?? '', style: TextStyle(fontSize: 13, color: c.inkDim))
                        : FittedBox(
                            fit: BoxFit.scaleDown,
                            alignment: Alignment.centerLeft,
                            child: MathText('\$$v\$', style: TextStyle(fontSize: 17, color: c.ink)),
                          ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}

class _Chip extends StatelessWidget {
  const _Chip({super.key, required this.label, required this.selected, required this.onTap, this.tex});
  final String label;
  final String? tex;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final fg = selected ? c.onBrand : c.ink;
    return Semantics(
      button: true,
      selected: selected,
      child: Material(
        color: selected ? c.brand : c.surface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(AppRadius.sm),
          side: BorderSide(color: selected ? c.brand : c.line),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(AppRadius.sm),
          child: Container(
            constraints: const BoxConstraints(minHeight: 40, minWidth: 40),
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
            alignment: Alignment.center,
            child: tex != null
                ? MathText('\$$tex\$', style: TextStyle(fontSize: 15, color: fg))
                : Text(label, style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: fg)),
          ),
        ),
      ),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({required this.icon, required this.text});
  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: c.inkDim),
        const SizedBox(width: AppSpace.sm),
        Expanded(child: MathText(text, style: TextStyle(fontSize: 15, color: c.inkDim))),
      ],
    );
  }
}

class _GraphButton extends StatelessWidget {
  const _GraphButton({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => OutlinedButton.icon(
    key: const ValueKey('solve-graph'),
    onPressed: onTap,
    icon: const Icon(LucideIcons.chartSpline, size: 18),
    label: const Text('Графикт харах'),
  );
}

class _Examples extends StatelessWidget {
  const _Examples({required this.onPick});
  final ValueChanged<String> onPick;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Жишээ', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.inkDim)),
        const SizedBox(height: AppSpace.xs),
        Wrap(
          spacing: AppSpace.sm,
          runSpacing: AppSpace.sm,
          children: [
            for (final (i, e) in solveExamples.indexed)
              InkWell(
                key: ValueKey('solve-example-$i'),
                onTap: () => onPick(e),
                borderRadius: BorderRadius.circular(AppRadius.sm),
                child: Container(
                  constraints: const BoxConstraints(minHeight: 44),
                  padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.xs),
                  decoration: BoxDecoration(
                    color: c.surface,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    border: Border.all(color: c.line),
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (final l in e.split('\n'))
                        MathText('\$${previewTex(l)}\$', style: TextStyle(fontSize: 15, color: c.ink)),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

/// Хариу: ангилал, бодлого, том хариу, ойролцоо, тооны шулуун, тэмдэглэл, алхам.
class ResultView extends StatelessWidget {
  const ResultView({super.key, required this.sol, this.onGraph});
  final Solution sol;
  final VoidCallback? onGraph;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final d = displayOf(sol);
    final source = solutionSource(sol);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AppCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(sol.title, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: c.inkDim)),
              if (sol.problem != null && sol.problem!.isNotEmpty) ...[
                const SizedBox(height: AppSpace.xs),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: MathText('\$${tidyTex(sol.problem!)}\$', style: TextStyle(fontSize: 17, color: c.inkDim)),
                ),
              ],
              if (d.main.isNotEmpty) ...[
                const SizedBox(height: AppSpace.sm),
                if (d.inline)
                  Wrap(
                    spacing: AppSpace.lg,
                    runSpacing: AppSpace.xs,
                    children: [
                      for (final m in d.main) MathText('\$$m\$', style: TextStyle(fontSize: 22, color: c.ink)),
                    ],
                  )
                else
                  for (final m in d.main)
                    Padding(
                      padding: const EdgeInsets.only(bottom: AppSpace.xs),
                      child: FittedBox(
                        key: const ValueKey('solve-answer'),
                        fit: BoxFit.scaleDown,
                        alignment: Alignment.centerLeft,
                        child: MathText('\$$m\$', style: TextStyle(fontSize: 22, color: c.ink)),
                      ),
                    ),
              ],
              for (final a in [...d.approx, ...d.alt])
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: MathText('\$$a\$', style: TextStyle(fontSize: 15, color: c.inkDim)),
                ),
              if (sol.numberLine != null && sol.numberLine!.points.isNotEmpty) ...[
                const SizedBox(height: AppSpace.sm),
                NumberLineView(data: sol.numberLine!),
              ],
              for (final n in sol.notes ?? const <String>[])
                Padding(
                  padding: const EdgeInsets.only(top: AppSpace.xs),
                  child: MathText(tidyTex(n), style: TextStyle(fontSize: 14, color: sol.ok ? c.inkDim : c.ink)),
                ),
              if (onGraph != null) ...[
                const SizedBox(height: AppSpace.sm),
                _GraphButton(onTap: onGraph!),
              ],
            ],
          ),
        ),
        if (source.trim().isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          SolutionView(key: ValueKey(source.hashCode), source: source, title: 'Бодолт'),
        ],
      ],
    );
  }
}

/// Түүх: бодсон бодлогууд (энэ төхөөрөмжид), дарвал буцаж бодогдоно.
class _HistorySheet extends StatelessWidget {
  const _HistorySheet({required this.history, required this.onClear});
  final ValueNotifier<List<SolveHistoryItem>> history;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: MediaQuery.sizeOf(context).height * 0.7),
        child: ListenableBuilder(
          key: const ValueKey('solve-history-sheet'),
          listenable: history,
          builder: (context, _) {
            final items = history.value;
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.xs, AppSpace.xs),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text('Түүх', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: c.ink)),
                      ),
                      if (items.isNotEmpty)
                        TextButton.icon(
                          key: const ValueKey('solve-history-clear'),
                          onPressed: onClear,
                          icon: const Icon(AppIcons.trash, size: 18),
                          label: const Text('Цэвэрлэх'),
                        ),
                    ],
                  ),
                ),
                if (items.isEmpty)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xl),
                    child: Row(
                      children: [
                        Icon(AppIcons.historyLog, size: 18, color: c.inkDim),
                        const SizedBox(width: AppSpace.sm),
                        Expanded(
                          child: Text(
                            'Бодсон бодлого энд хадгалагдана',
                            style: TextStyle(fontSize: 15, color: c.inkDim),
                          ),
                        ),
                      ],
                    ),
                  )
                else
                  Flexible(
                    child: ListView.builder(
                      shrinkWrap: true,
                      padding: const EdgeInsets.fromLTRB(AppSpace.sm, 0, AppSpace.sm, AppSpace.lg),
                      itemCount: items.length,
                      itemBuilder: (context, i) => _HistoryRow(
                        key: ValueKey('solve-history-$i'),
                        item: items[i],
                        onTap: () => Navigator.of(context).pop(items[i]),
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _HistoryRow extends StatelessWidget {
  const _HistoryRow({super.key, required this.item, required this.onTap});
  final SolveHistoryItem item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final lines = item.isSeq
        ? [for (final e in item.extra.entries) if (e.value.isNotEmpty) '${e.key}=${e.value}'].join(',  ')
        : null;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: Container(
        constraints: const BoxConstraints(minHeight: AppSizes.minTap),
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: AppSpace.xs),
        alignment: Alignment.centerLeft,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(item.title, style: TextStyle(fontSize: 12, color: c.inkDim)),
            if (lines != null)
              Text(lines, style: TextStyle(fontSize: 15, color: c.ink))
            else
              for (final l in item.text.split('\n'))
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: MathText('\$${previewTex(l)}\$', style: TextStyle(fontSize: 16, color: c.ink)),
                ),
          ],
        ),
      ),
    );
  }
}
