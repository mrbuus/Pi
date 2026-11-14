import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';
import 'plane_free_view.dart';
import 'plane_template_view.dart';
import 'tool_widgets.dart';
import 'tools_back.dart';

/// Хавтгайн дүрс: «Загвар» (бэлэн дүрс, утга бичих) ба «Чөлөөт» (зураг дээр байгуулах).
class PlaneScreen extends StatefulWidget {
  const PlaneScreen({super.key, this.initialFree = false});

  final bool initialFree;

  @override
  State<PlaneScreen> createState() => _PlaneScreenState();
}

class _PlaneScreenState extends State<PlaneScreen> {
  late bool _free = widget.initialFree;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(
        leading: const ToolsBackButton(),
        title: const Text('Хавтгайн дүрс'),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: Container(
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: c.line)),
            ),
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.sm),
            child: Row(
              children: [
                Expanded(
                  child: ToolPill(
                    key: const ValueKey('plane-tab-template'),
                    label: 'Загвар',
                    selected: !_free,
                    onTap: () => setState(() => _free = false),
                  ),
                ),
                const SizedBox(width: AppSpace.sm),
                Expanded(
                  child: ToolPill(
                    key: const ValueKey('plane-tab-free'),
                    label: 'Чөлөөт байгуулалт',
                    selected: _free,
                    onTap: () => setState(() => _free = true),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: SafeArea(
        top: false,
        // Хоёр горимын төлөв солиход алдагдахгүй.
        child: IndexedStack(index: _free ? 1 : 0, children: const [PlaneTemplateView(), PlaneFreeView()]),
      ),
    );
  }
}
