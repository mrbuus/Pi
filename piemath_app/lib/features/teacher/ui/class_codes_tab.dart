import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/ui/ui.dart';
import '../data/teacher_models.dart';
import 'teacher_widgets.dart';

/// Сурагчийн нэр + код (багш хүүхэд бүрт кодыг нь хэлж өгөхөд). Нэрээр эрэмбэлнэ.
/// Хуулах бичвэр: «Нэр Овог - код» мөр бүрт (вэбийн `CodesTab`-тай ижил), кодгүй бол «кодгүй».
class ClassCodesTab extends StatefulWidget {
  const ClassCodesTab({super.key, required this.students});

  final List<RosterStudent> students;

  /// Нэрээр (өөрийн нэр, дараа нь овог) эрэмбэлсэн жагсаалт.
  static List<RosterStudent> sorted(List<RosterStudent> list) => [...list]
    ..sort((a, b) {
      final byFirst = a.firstName.toLowerCase().compareTo(b.firstName.toLowerCase());
      return byFirst != 0 ? byFirst : (a.lastName ?? '').toLowerCase().compareTo((b.lastName ?? '').toLowerCase());
    });

  static String fullName(RosterStudent s) => [s.firstName, s.lastName].where((x) => x != null && x.trim().isNotEmpty).join(' ');

  static String _code(RosterStudent s) => (s.studentCode == null || s.studentCode!.trim().isEmpty) ? 'кодгүй' : s.studentCode!;

  /// Бүгдийг хуулах бичвэр.
  static String copyText(List<RosterStudent> list) => sorted(list).map((s) => '${fullName(s)} - ${_code(s)}').join('\n');

  @override
  State<ClassCodesTab> createState() => _ClassCodesTabState();
}

class _ClassCodesTabState extends State<ClassCodesTab> {
  /// null = хараахан хуулаагүй, true = хуулсан, false = алдаа.
  bool? _copied;

  Future<void> _copy() async {
    bool ok;
    try {
      await Clipboard.setData(ClipboardData(text: ClassCodesTab.copyText(widget.students)));
      ok = true;
    } catch (_) {
      ok = false;
    }
    if (!mounted) return;
    setState(() => _copied = ok);
    await Future<void>.delayed(const Duration(milliseconds: 1800));
    if (mounted) setState(() => _copied = null);
  }

  @override
  Widget build(BuildContext context) {
    final rows = ClassCodesTab.sorted(widget.students);
    if (rows.isEmpty) return const EmptyState(icon: AppIcons.students, title: 'Ангид сурагч алга');
    final c = context.colors;
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        Row(
          children: [
            Expanded(child: Text('Сурагчийн код', style: context.text.titleSmall)),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(minimumSize: const Size(140, teacherTap)),
              onPressed: _copy,
              icon: Icon(_copied == true ? AppIcons.check : AppIcons.copy, size: 18),
              label: Text(
                _copied == true
                    ? 'Хуулсан'
                    : _copied == false
                    ? 'Хуулж чадсангүй'
                    : 'Бүгдийг хуулах',
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpace.sm),
        AppCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              for (final (i, s) in rows.indexed) ...[
                if (i > 0) Divider(height: 1, color: c.line),
                ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: teacherTap),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.sm),
                    child: Row(
                      children: [
                        SizedBox(
                          width: 28,
                          child: Text('${i + 1}', textAlign: TextAlign.end, style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                        ),
                        const SizedBox(width: AppSpace.md),
                        Expanded(
                          child: Text.rich(
                            TextSpan(
                              text: s.firstName,
                              children: [
                                if ((s.lastName ?? '').trim().isNotEmpty)
                                  TextSpan(text: ' ${s.lastName}', style: TextStyle(color: c.inkDim)),
                              ],
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        Text(
                          ClassCodesTab._code(s),
                          style: s.studentCode == null || s.studentCode!.trim().isEmpty
                              ? context.text.bodySmall?.copyWith(color: c.inkDim)
                              : context.text.titleMedium?.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ],
    );
  }
}
