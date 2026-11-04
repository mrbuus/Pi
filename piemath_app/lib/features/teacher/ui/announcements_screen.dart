import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../application/staff_providers.dart';
import '../application/teacher_providers.dart';
import '../data/staff_models.dart';
import '../data/staff_repository.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

/// Төвийн самбарт зар тавих (`/app/teacher/announcements`; Багш, Багш+, Админ — сервер шийднэ).
/// `POST /announcements`; өмнөх зарууд `GET /announcements/manage` (унших). Устгах, засах вэбээр.
class AnnouncementsScreen extends ConsumerStatefulWidget {
  const AnnouncementsScreen({super.key});

  @override
  ConsumerState<AnnouncementsScreen> createState() => _AnnouncementsScreenState();
}

class _AnnouncementsScreenState extends ConsumerState<AnnouncementsScreen> {
  final _title = TextEditingController();
  final _body = TextEditingController();
  AnnouncementAudience _audience = AnnouncementAudience.allClassroom;
  final _picked = <String>{};
  bool _pinned = false;
  bool _busy = false;
  String? _msg;
  bool _ok = false;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  bool get _ready =>
      _title.text.trim().isNotEmpty &&
      _body.text.trim().isNotEmpty &&
      (_audience != AnnouncementAudience.selected || _picked.isNotEmpty);

  Future<void> _send() async {
    if (!_ready || _busy) return;
    setState(() {
      _busy = true;
      _msg = null;
    });
    try {
      await ref
          .read(staffRepositoryProvider)
          .postAnnouncement(
            title: _title.text,
            body: _body.text,
            audience: _audience,
            pinned: _pinned,
            classroomIds: _picked.toList(),
          );
      _title.clear();
      _body.clear();
      _picked.clear();
      _pinned = false;
      _audience = AnnouncementAudience.allClassroom;
      _ok = true;
      _msg = 'Зар тавигдлаа';
      ref.invalidate(announcementsProvider);
    } catch (e) {
      _ok = false;
      _msg = errorText(e, 'Зар тавигдсангүй, дахин оролдоно уу');
    }
    if (mounted) setState(() => _busy = false);
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final list = ref.watch(announcementsProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Зар')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
        children: [
          Text('Бүх сурагч, онлайн сурагчид эсвэл сонгосон ангиудад зарлана', style: context.text.bodyMedium),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: _title,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(labelText: 'Гарчиг'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpace.sm),
          TextField(
            controller: _body,
            minLines: 3,
            maxLines: 6,
            decoration: const InputDecoration(labelText: 'Зарын агуулга'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: AppSpace.md),
          Text('Хэнд', style: context.text.labelLarge),
          const SizedBox(height: AppSpace.xs),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              for (final a in AnnouncementAudience.values)
                ChoiceChip(
                  label: Text(a.label),
                  selected: _audience == a,
                  showCheckmark: false,
                  materialTapTargetSize: MaterialTapTargetSize.padded,
                  onSelected: (_) => setState(() => _audience = a),
                ),
            ],
          ),
          if (_audience == AnnouncementAudience.selected) ...[
            const SizedBox(height: AppSpace.md),
            ref
                .watch(classroomsProvider)
                .when(
                  loading: () => const LinearProgressIndicator(),
                  error: (e, _) => Text(errorText(e, 'Ангийн жагсаалт нээгдсэнгүй'), style: context.text.bodySmall),
                  data: (rooms) => Wrap(
                    spacing: AppSpace.sm,
                    runSpacing: AppSpace.sm,
                    children: [
                      for (final r in rooms)
                        FilterChip(
                          label: Text(r.name),
                          selected: _picked.contains(r.id),
                          showCheckmark: false,
                          materialTapTargetSize: MaterialTapTargetSize.padded,
                          onSelected: (v) => setState(() => v ? _picked.add(r.id) : _picked.remove(r.id)),
                        ),
                    ],
                  ),
                ),
          ],
          const SizedBox(height: AppSpace.sm),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('Дээр бэхлэх'),
            secondary: Icon(TeacherIcons.pin, color: c.inkDim),
            value: _pinned,
            onChanged: (v) => setState(() => _pinned = v),
          ),
          const SizedBox(height: AppSpace.sm),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(teacherTap)),
            onPressed: _ready && !_busy ? _send : null,
            child: Text(_busy ? 'Илгээж байна' : 'Зарлах'),
          ),
          if (_msg != null) ...[
            const SizedBox(height: AppSpace.sm),
            Semantics(
              liveRegion: true,
              child: Row(
                children: [
                  Icon(_ok ? AppIcons.success : AppIcons.error, size: 18, color: _ok ? c.success : c.error),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(child: Text(_msg!, style: context.text.bodyMedium)),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpace.xl),
          Text('Тавигдсан зарууд', style: context.text.titleSmall),
          const SizedBox(height: AppSpace.sm),
          list.when(
            skipLoadingOnRefresh: false,
            loading: () => const LinearProgressIndicator(),
            error: (e, _) => Row(
              children: [
                Expanded(child: Text(errorText(e, 'Зарууд нээгдсэнгүй'), style: context.text.bodyMedium)),
                TextButton(
                  style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                  onPressed: () => ref.invalidate(announcementsProvider),
                  child: const Text(AppStrings.retry),
                ),
              ],
            ),
            data: (items) => items.isEmpty
                ? Text('Тавигдсан зар алга', style: context.text.bodyMedium?.copyWith(color: c.inkDim))
                : AppCard(
                    padding: EdgeInsets.zero,
                    child: Column(
                      children: [
                        for (final (i, a) in items.indexed) ...[
                          if (i > 0) Divider(height: 1, color: c.line),
                          ListTile(
                            minTileHeight: teacherTap,
                            leading: a.pinned ? Icon(TeacherIcons.pin, color: c.brand) : null,
                            title: Text(a.title),
                            subtitle: Text('${a.audienceLabel}, ${a.body}', maxLines: 2, overflow: TextOverflow.ellipsis),
                          ),
                        ],
                      ],
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
