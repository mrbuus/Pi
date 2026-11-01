import 'package:flutter/material.dart';

import '../../../core/math/math.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/math_keyboard/math_keyboard_lib.dart';
import '../domain/figure.dart';
import '../domain/shapes.dart' show ParamSpec;

/// Үр дүнгийн жагсаалт: гол үр дүн эхний картанд, бусад нь доор.
class ResultsList extends StatelessWidget {
  const ResultsList({super.key, required this.metrics});

  final List<Metric> metrics;

  @override
  Widget build(BuildContext context) {
    final key = metrics.where((m) => m.key).toList();
    final rest = metrics.where((m) => !m.key).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (key.isNotEmpty) _card(context, key, big: true),
        if (rest.isNotEmpty) ...[
          const SectionHeader(title: 'Бусад үр дүн', padding: EdgeInsets.fromLTRB(4, AppSpace.lg, 4, AppSpace.sm)),
          _card(context, rest, big: false),
        ],
      ],
    );
  }

  Widget _card(BuildContext context, List<Metric> list, {required bool big}) {
    final c = context.colors;
    return AppCard(
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < list.length; i++) ...[
            if (i > 0) Divider(height: 1, thickness: 1, color: c.line),
            _MetricTile(metric: list[i], big: big),
          ],
        ],
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.metric, required this.big});

  final Metric metric;
  final bool big;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            metric.name,
            style: TextStyle(fontSize: 13, color: c.inkDim, fontWeight: FontWeight.w500),
          ),
          const SizedBox(height: AppSpace.xs),
          if (metric.text != null)
            Text(
              metric.text!,
              style: TextStyle(fontSize: big ? 17 : 15, color: c.ink, fontWeight: FontWeight.w600),
            ),
          for (final r in metric.rows)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              // Урт томьёо (Герон г.м.) нарийн утсанд хэтрэхгүй — хэвтээ гүйлгэнэ.
              child: SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: MathText(
                  '\$${r.tex}\$',
                  style: TextStyle(fontSize: big ? 18 : 16, color: c.ink),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Сонголтын товч (дүрс, горим). Радиус жижиг (24+ радиус AI маяг — UX §0).
class ToolPill extends StatelessWidget {
  const ToolPill({super.key, required this.label, required this.selected, required this.onTap, this.icon});

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
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
            constraints: const BoxConstraints(minHeight: 40),
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.md),
            alignment: Alignment.center,
            // Нарийн дэлгэцэд (360dp) бичвэр багтахгүй бол жижгэрнэ — халихгүй.
            child: FittedBox(
              fit: BoxFit.scaleDown,
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18, color: selected ? c.onBrand : c.inkDim),
                    const SizedBox(width: 6),
                  ],
                  Text(
                    label,
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: selected ? c.onBrand : c.ink),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Хэвтээ гүйдэг сонголтын мөр.
class PillRow extends StatelessWidget {
  const PillRow({super.key, required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter, vertical: 4),
        itemCount: children.length,
        separatorBuilder: (_, _) => const SizedBox(width: AppSpace.sm),
        itemBuilder: (_, i) => children[i],
      ),
    );
  }
}

/// Утгын талбарууд нэг мөрөнд (3 хүртэл), олон бол 2 мөрөнд.
class ParamFields extends StatelessWidget {
  const ParamFields({
    super.key,
    required this.specs,
    required this.controllers,
    required this.group,
    this.invalid = const {},
  });

  final List<ParamSpec> specs;
  final Map<String, MathInputController> controllers;
  final MathFieldGroup group;
  final Set<String> invalid;

  @override
  Widget build(BuildContext context) {
    final fields = [
      for (final s in specs)
        MathField(
          key: ValueKey('field-${s.key}'),
          controller: controllers[s.key]!,
          group: group,
          labelTex: s.tex,
          name: s.name,
          invalid: invalid.contains(s.key),
        ),
    ];
    return LayoutBuilder(
      builder: (context, box) {
        final perRow = box.maxWidth < 290 ? 2 : 3;
        final rows = <Widget>[];
        for (var i = 0; i < fields.length; i += perRow) {
          final chunk = fields.sublist(i, i + perRow > fields.length ? fields.length : i + perRow);
          rows.add(
            Row(
              children: [
                for (var j = 0; j < perRow; j++) ...[
                  if (j > 0) const SizedBox(width: AppSpace.sm),
                  Expanded(child: j < chunk.length ? chunk[j] : const SizedBox.shrink()),
                ],
              ],
            ),
          );
        }
        return Column(
          children: [
            for (var i = 0; i < rows.length; i++) ...[if (i > 0) const SizedBox(height: AppSpace.sm), rows[i]],
          ],
        );
      },
    );
  }
}

/// Ажлын талбар: зураг дээр, утга ба үр дүн доор; гар нээгдвэл зураг + талбар + гар.
/// Таблет (768dp+) дээр зураг зүүн, самбар баруун.
class ToolWorkspace extends StatelessWidget {
  const ToolWorkspace({
    super.key,
    required this.group,
    required this.figure,
    required this.fields,
    required this.results,
    this.header,
  });

  final MathFieldGroup group;
  final Widget figure;
  final Widget fields;
  final Widget results;
  final Widget? header;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ListenableBuilder(
      listenable: group,
      builder: (context, _) {
        final open = group.isOpen;
        return LayoutBuilder(
          builder: (context, box) {
            final tablet = box.maxWidth >= AppSizes.tabletBreakpoint;
            final keyH = box.maxHeight < 640 ? 50.0 : 54.0;
            final figureBox = Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.sm),
              child: Container(
                decoration: BoxDecoration(
                  color: c.surface,
                  borderRadius: BorderRadius.circular(AppRadius.md),
                  border: Border.all(color: c.line),
                ),
                clipBehavior: Clip.antiAlias,
                child: RepaintBoundary(child: figure),
              ),
            );
            final panel = <Widget>[
              Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.sm),
                child: fields,
              ),
            ];
            if (tablet) {
              return Row(
                children: [
                  Expanded(
                    child: Column(
                      children: [
                        ?header,
                        Expanded(child: figureBox),
                      ],
                    ),
                  ),
                  Container(width: 1, color: c.line),
                  SizedBox(
                    width: 400,
                    child: Column(
                      children: [
                        const SizedBox(height: AppSpace.sm),
                        ...panel,
                        Expanded(
                          child: open
                              ? const SizedBox.shrink()
                              : ListView(
                                  padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
                                  children: [results],
                                ),
                        ),
                        if (open) MathKeyboard(group: group, keyHeight: 56),
                      ],
                    ),
                  ),
                ],
              );
            }
            if (open) {
              return Column(
                children: [
                  ?header,
                  Expanded(child: figureBox),
                  ...panel,
                  MathKeyboard(group: group, keyHeight: keyH),
                ],
              );
            }
            final figureH = (box.maxHeight * 0.42).clamp(190.0, 440.0);
            // Зураг байнга дээр (чирж эргүүлэхэд хуудас гүйхгүй), доод хэсэг л гүйнэ.
            return Column(
              children: [
                ?header,
                SizedBox(height: figureH, child: figureBox),
                Expanded(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      border: Border(top: BorderSide(color: c.line)),
                    ),
                    child: ListView(
                      padding: const EdgeInsets.only(top: AppSpace.sm, bottom: AppSpace.xxl),
                      children: [
                        panel.first,
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
                          child: results,
                        ),
                      ],
                    ),
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

/// Утга буруу үед зургийн оронд: юу буруу, яаж засах (монголоор, айлгахгүй).
class FigureMessage extends StatelessWidget {
  const FigureMessage({super.key, required this.message, this.tex});

  final String message;
  final String? tex;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpace.lg),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(AppIcons.info, color: c.inkDim, size: 28),
            const SizedBox(height: AppSpace.sm),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 15, color: c.ink, height: 1.35),
            ),
            if (tex != null) ...[
              const SizedBox(height: AppSpace.sm),
              MathText('\$$tex\$', style: TextStyle(fontSize: 17, color: c.inkDim)),
            ],
          ],
        ),
      ),
    );
  }
}
