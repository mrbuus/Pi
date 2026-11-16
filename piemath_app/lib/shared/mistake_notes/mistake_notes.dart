import 'package:flutter/material.dart';

import '../../core/math/math.dart';
import '../../core/ui/ui.dart';

/// «Түгээмэл алдаа» — нэг буруу сонголтын тайлбар. Тест (`/tests/:id/review` → `items[].mistakeNotes[]`)
/// болон нэгдсэн шалгалтын бодлого (`/paper-exams/my/:id/problems` → `content.mistakes`) хоёулаа ашиглана.
@immutable
class MistakeNote {
  const MistakeNote({required this.label, this.text = '', required this.note, this.mine = false});

  static MistakeNote? fromJson(Object? raw) {
    final j = raw is Map ? raw.cast<String, Object?>() : const <String, Object?>{};
    final note = (j['note'] is String ? j['note']! as String : null)?.trim();
    if (note == null || note.isEmpty) return null;
    String str(Object? v) => v is String ? v : '';
    return MistakeNote(label: str(j['label']), text: str(j['text']), note: note, mine: j['mine'] == true);
  }

  /// Канон үсэг (A, B, …)
  final String label;

  /// Сонголтын текст (LaTeX) — үсэггүй дэлгэцэд аль сонголт болохыг, эсвэл үсгийн ард утгыг харуулна.
  final String text;
  final String note;

  /// Сурагчийн өөрийн сонгосон хариу эсэх.
  final bool mine;
}

/// «Түгээмэл алдаа» — буруу сонголтын тайлбар. Сурагчийн сонгосон нь эхэнд, онцолсон.
/// Сервер бодолт нээгдсэн үед л илгээнэ; хоосон бол дуудагч зурахгүй.
class MistakeNotesView extends StatelessWidget {
  const MistakeNotesView({super.key, required this.notes, this.showLabels = true, this.showChoiceText = false});

  final List<MistakeNote> notes;

  /// Сонголт үсэгтэй харагдсан эсэх; үгүй бол сонголтын текстийг харуулна.
  final bool showLabels;

  /// Үсэгтэй үед ч сонголтын утгыг үсгийн ард харуулах (сонголтууд дээр нь зурагдаагүй дэлгэцэд).
  final bool showChoiceText;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      container: true,
      label: 'Түгээмэл алдаа',
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(AppSpace.md),
        decoration: BoxDecoration(
          color: c.surface,
          border: Border.all(color: c.line),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(AppIcons.error, size: 16, color: c.error),
                const SizedBox(width: AppSpace.xs),
                Text('Түгээмэл алдаа', style: context.text.titleSmall),
              ],
            ),
            for (final n in notes) ...[
              const SizedBox(height: AppSpace.sm),
              _MistakeNoteTile(note: n, showLabel: showLabels, showText: !showLabels || showChoiceText),
            ],
          ],
        ),
      ),
    );
  }
}

class _MistakeNoteTile extends StatelessWidget {
  const _MistakeNoteTile({required this.note, required this.showLabel, required this.showText});

  final MistakeNote note;
  final bool showLabel;
  final bool showText;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final title = note.mine
        ? (showLabel ? 'Таны сонгосон ${note.label}' : 'Таны сонгосон хариу')
        : (showLabel ? '${note.label} хариу' : 'Өөр буруу хариу');
    final labelStyle = context.text.labelMedium?.copyWith(color: note.mine ? c.error : c.inkDim);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpace.sm),
      decoration: BoxDecoration(
        color: note.mine ? c.errorTint : null,
        border: Border.all(color: note.mine ? c.error : c.line),
        borderRadius: BorderRadius.circular(AppRadius.sm),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: labelStyle),
          if (showText && note.text.isNotEmpty) MathText(note.text, style: context.text.bodySmall),
          const SizedBox(height: AppSpace.xs),
          MathText(note.note, style: context.text.bodyMedium),
        ],
      ),
    );
  }
}
