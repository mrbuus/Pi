import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../core/ui/ui.dart';

/// Хэрэглэгдэхүүний жагсаалт.
class ToolsHubScreen extends StatelessWidget {
  const ToolsHubScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Хэрэглэгдэхүүн')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpace.gutter),
        children: const [
          _ToolCard(
            key: ValueKey('tool-plane'),
            icon: LucideIcons.triangle,
            title: 'Хавтгайн дүрс',
            subtitle: 'Гурвалжин, дөрвөн өнцөгт, тойрог, олон өнцөгт. Зураг дээр өөрөө байгуулах',
            path: '/app/tools/plane',
          ),
          SizedBox(height: AppSpace.md),
          _ToolCard(
            key: ValueKey('tool-solid'),
            icon: LucideIcons.box,
            title: 'Огторгуйн биет',
            subtitle: 'Куб, призм, пирамид, цилиндр, конус, бөмбөрцөг. Эзлэхүүн, гадаргуу',
            path: '/app/tools/solid',
          ),
        ],
      ),
    );
  }
}

class _ToolCard extends StatelessWidget {
  const _ToolCard({super.key, required this.icon, required this.title, required this.subtitle, required this.path});

  final IconData icon;
  final String title;
  final String subtitle;
  final String path;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AppCard(
      onTap: () => context.push(path),
      semanticLabel: title,
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.sm),
              border: Border.all(color: c.line),
            ),
            child: Icon(icon, color: c.brand, size: 24),
          ),
          const SizedBox(width: AppSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: TextStyle(fontSize: 17, fontWeight: FontWeight.w600, color: c.ink),
                ),
                const SizedBox(height: 2),
                Text(subtitle, style: TextStyle(fontSize: 13, color: c.inkDim, height: 1.3)),
              ],
            ),
          ),
          Icon(AppIcons.forward, color: c.inkDim),
        ],
      ),
    );
  }
}
