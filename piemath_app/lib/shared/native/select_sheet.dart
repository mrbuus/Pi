import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/ui/ui.dart';

/// Сонголтын нэг мөр.
@immutable
class SelectOption<T> {
  const SelectOption(this.value, this.label, {this.subtitle, this.icon});

  final T value;
  final String label;
  final String? subtitle;
  final IconData? icon;
}

/// Доороос гарах сонголтын жагсаалт. Сонгосон мөрийг буцаана, хаавал `null`.
/// [searchThreshold]-ээс олон сонголттой бол дээр нь хайлт гарна.
Future<SelectOption<T>?> showSelectSheet<T>(
  BuildContext context, {
  required String title,
  required List<SelectOption<T>> options,
  T? selected,
  int searchThreshold = 8,
}) {
  return showModalBottomSheet<SelectOption<T>>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    showDragHandle: false,
    backgroundColor: Colors.transparent,
    elevation: 0,
    builder: (_) => _SelectSheet<T>(
      title: title,
      options: options,
      selected: selected,
      searchable: options.length > searchThreshold,
    ),
  );
}

class _SelectSheet<T> extends StatefulWidget {
  const _SelectSheet({required this.title, required this.options, required this.selected, required this.searchable});

  final String title;
  final List<SelectOption<T>> options;
  final T? selected;
  final bool searchable;

  @override
  State<_SelectSheet<T>> createState() => _SelectSheetState<T>();
}

class _SelectSheetState<T> extends State<_SelectSheet<T>> {
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final q = _q.trim().toLowerCase();
    final shown = q.isEmpty
        ? widget.options
        : widget.options
              .where((o) => o.label.toLowerCase().contains(q) || (o.subtitle?.toLowerCase().contains(q) ?? false))
              .toList();
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: DraggableScrollableSheet(
        expand: false,
        initialChildSize: widget.options.length > 6 ? 0.75 : 0.5,
        minChildSize: 0.3,
        maxChildSize: 0.94,
        builder: (context, scroll) => Material(
          color: c.surface,
          shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg))),
          clipBehavior: Clip.antiAlias,
          child: CustomScrollView(
            controller: scroll,
            slivers: [
              PinnedHeaderSliver(
                child: ColoredBox(
                  color: c.surface,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.xs, AppSpace.sm),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Semantics(header: true, child: Text(widget.title, style: context.text.titleLarge)),
                            ),
                            IconButton(
                              tooltip: AppStrings.close,
                              icon: const Icon(AppIcons.close),
                              onPressed: () => Navigator.of(context).pop(),
                            ),
                          ],
                        ),
                        if (widget.searchable)
                          Padding(
                            padding: const EdgeInsets.only(right: AppSpace.md, top: AppSpace.xs),
                            child: TextField(
                              onChanged: (v) => setState(() => _q = v),
                              decoration: const InputDecoration(
                                hintText: 'Хайх',
                                prefixIcon: Icon(AppIcons.search, size: 20),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              if (shown.isEmpty)
                const SliverFillRemaining(
                  hasScrollBody: false,
                  child: EmptyState(icon: AppIcons.search, title: 'Илэрц олдсонгүй'),
                )
              else
                SliverList.builder(
                  itemCount: shown.length,
                  itemBuilder: (context, i) {
                    final o = shown[i];
                    final isSelected = o.value == widget.selected;
                    return ListTile(
                      minTileHeight: AppSizes.minTap + 4,
                      leading: o.icon == null ? null : Icon(o.icon),
                      title: Text(
                        o.label,
                        style: context.text.bodyLarge?.copyWith(
                          color: isSelected ? c.brand : c.ink,
                          fontWeight: isSelected ? FontWeight.w600 : FontWeight.w400,
                        ),
                      ),
                      subtitle: o.subtitle == null ? null : Text(o.subtitle!, style: context.text.bodySmall),
                      trailing: isSelected ? Icon(AppIcons.check, color: c.brand) : null,
                      selected: isSelected,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        Navigator.of(context).pop(o);
                      },
                    );
                  },
                ),
              SliverToBoxAdapter(child: SizedBox(height: AppSpace.lg + MediaQuery.viewPaddingOf(context).bottom)),
            ],
          ),
        ),
      ),
    );
  }
}
