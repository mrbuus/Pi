import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/format/person_name.dart';
import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/form_sheet.dart' show ThousandsFormatter;
import '../../../shared/payment_status/money.dart';
import '../application/checks_controller.dart';
import '../data/class_checks.dart';
import '../domain/board_logic.dart';
import 'teacher_icons.dart';
import 'teacher_widgets.dart';

// «Чек» (эзэн 2026-10-22, 2026-11-10) — вэбийн `ClassChecksPanel`, `CheckStudentSheet`.

String _err(Object e, String fallback) => e is ApiError && e.message.trim().isNotEmpty ? e.message : fallback;

void _snack(BuildContext context, String message) {
  ScaffoldMessenger.maybeOf(context)
    ?..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(message)));
}

/// ISO агшин → «11.10» (UB).
String _md(String iso) {
  final s = onlineStamp(iso);
  return s.length >= 5 ? s.substring(0, 5) : s;
}

String _who(CheckPerson? p) => p?.staff ?? 'Хэн нэгэн';

enum _Filter { all, left, done }

/// `/app/classes/:id/checks` — ангийн чекүүд. Дарах бүрд шууд хадгалагдана.
class ClassChecksScreen extends ConsumerStatefulWidget {
  const ClassChecksScreen({super.key, required this.classId, this.className});

  final String classId;
  final String? className;

  @override
  ConsumerState<ClassChecksScreen> createState() => _ClassChecksScreenState();
}

class _ClassChecksScreenState extends ConsumerState<ClassChecksScreen> {
  late final AppLifecycleListener _life;
  String? _selectedId;
  bool _creating = false;

  @override
  void initState() {
    super.initState();
    // Өөр апп руу (ж: банк) шилжээд буцахад нөгөө багшийн тэмдэглэсэн нь харагдана.
    _life = AppLifecycleListener(
      onResume: () {
        if (mounted) ref.read(classChecksProvider(widget.classId).notifier).load(quiet: true);
      },
    );
  }

  @override
  void dispose() {
    _life.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = classChecksProvider(widget.classId);
    ref.listen(provider.select((s) => s.markError), (_, e) {
      if (e != null) _snack(context, e);
    });
    final s = ref.watch(provider);
    final ctl = ref.read(provider.notifier);
    final data = s.data;
    final selected = _selectedId == null ? null : s.find(_selectedId!);
    final Widget body;
    if (data == null && s.error != null) {
      body = ErrorState(message: s.error!, onRetry: ctl.load);
    } else if (data == null) {
      body = const LoadingState(cards: 4);
    } else if (selected != null) {
      body = _CheckDetail(
        key: ValueKey('detail-${selected.id}'),
        classId: widget.classId,
        check: selected,
        data: data,
        saving: s.saving,
        onBack: () => setState(() => _selectedId = null),
      );
    } else {
      body = _CheckList(
        classId: widget.classId,
        data: data,
        creating: _creating,
        onCreate: () => setState(() => _creating = true),
        onCancelCreate: () => setState(() => _creating = false),
        onCreated: (id) => setState(() {
          _creating = false;
          _selectedId = id;
        }),
        onOpen: (id) => setState(() => _selectedId = id),
      );
    }
    return PopScope(
      canPop: selected == null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop && selected != null) setState(() => _selectedId = null);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Чек'),
              if (widget.className != null)
                Text(widget.className!, style: context.text.bodySmall?.copyWith(color: context.colors.inkDim)),
            ],
          ),
        ),
        body: RefreshIndicator(onRefresh: ctl.load, child: body),
      ),
    );
  }
}

class _CheckList extends ConsumerWidget {
  const _CheckList({
    required this.classId,
    required this.data,
    required this.creating,
    required this.onCreate,
    required this.onCancelCreate,
    required this.onCreated,
    required this.onOpen,
  });

  final String classId;
  final ClassChecksData data;
  final bool creating;
  final VoidCallback onCreate;
  final VoidCallback onCancelCreate;
  final ValueChanged<String> onCreated;
  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final roster = {for (final p in data.students) p.id};
    // Нэг ангид нэг номын ганц чек — нээсэн (нуусан ч) номыг дахин сонгуулахгүй.
    final usedBooks = {
      for (final c in [...data.checks, ...data.archived])
        if (c.bookKey != null) c.bookKey!,
    };
    final c = context.colors;
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
      children: [
        if (creating)
          _CheckForm(
            chooseKind: true,
            usedBooks: usedBooks,
            submitLabel: 'Нээх',
            onCancel: onCancelCreate,
            onSubmit: (title, amount, bookKey) async {
              final created = await ref
                  .read(classChecksProvider(classId).notifier)
                  .create(title: title, amount: amount, bookKey: bookKey);
              if (context.mounted) {
                _snack(context, 'Чек нээлээ');
                onCreated(created.id);
              }
            },
          )
        else
          Align(
            alignment: Alignment.centerLeft,
            child: FilledButton.tonalIcon(
              key: const ValueKey('check-new'),
              style: FilledButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
              onPressed: onCreate,
              icon: const Icon(AppIcons.add, size: 18),
              label: const Text('Шинэ чек'),
            ),
          ),
        const SizedBox(height: AppSpace.md),
        if (data.checks.isEmpty && !creating)
          const SizedBox(
            height: 220,
            child: EmptyState(
              icon: TeacherIcons.clipboardCheck,
              title: 'Нээлттэй чек алга',
              message: 'Ном эсвэл шалгалтаа сонгож, бусад зүйлийг нэрлэж нээгээд хүүхэд бүрийг тэмдэглэнэ',
            ),
          ),
        for (final ch in data.checks) ...[
          _CheckRow(check: ch, roster: roster, onOpen: () => onOpen(ch.id)),
          const SizedBox(height: AppSpace.sm),
        ],
        if (data.archived.isNotEmpty)
          Theme(
            data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
            child: ExpansionTile(
              key: const ValueKey('checks-archived'),
              tilePadding: EdgeInsets.zero,
              childrenPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              title: Row(
                children: [
                  Text('Нуусан', style: context.text.labelLarge?.copyWith(color: c.inkDim)),
                  const SizedBox(width: AppSpace.xs),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: c.ink.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppRadius.pill),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 6),
                      child: Text('${data.archived.length}', style: context.text.labelSmall),
                    ),
                  ),
                ],
              ),
              children: [
                for (final ch in data.archived) ...[
                  _CheckRow(check: ch, roster: roster, quiet: true, onOpen: () => onOpen(ch.id)),
                  const SizedBox(height: AppSpace.xs),
                ],
              ],
            ),
          ),
      ],
    );
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.value, this.height = 6});

  final double value;
  final double height;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.pill),
      child: SizedBox(
        height: height,
        child: Stack(
          children: [
            Positioned.fill(child: ColoredBox(color: c.ink.withValues(alpha: 0.1))),
            FractionallySizedBox(
              widthFactor: value.clamp(0, 1).toDouble(),
              child: ColoredBox(color: c.success),
            ),
          ],
        ),
      ),
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({required this.check, required this.roster, required this.onOpen, this.quiet = false});

  final ClassCheck check;
  final Set<String> roster;
  final VoidCallback onOpen;
  final bool quiet;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final s = checkSummary(check, roster);
    return AppCard(
      key: ValueKey('check-${check.id}'),
      onTap: onOpen,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Flexible(
                      child: Text(
                        check.title,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: context.text.titleSmall?.copyWith(color: quiet ? c.inkDim : c.ink),
                      ),
                    ),
                    if (check.amount != null) ...[
                      const SizedBox(width: AppSpace.sm),
                      Text(formatMnt(check.amount!), style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                    ],
                  ],
                ),
                if (!quiet) ...[const SizedBox(height: 6), _Progress(value: s.total == 0 ? 0 : s.done / s.total)],
                const SizedBox(height: AppSpace.xs),
                Meta(
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  items: [
                    '${s.done}/${s.total}',
                    if (s.collected != null && s.collected! > 0) formatMnt(s.collected!),
                    if (s.skipped > 0) '${s.skipped} авахгүй',
                    quiet && check.archivedAt != null
                        ? '${_who(check.archivedBy)} нуусан, ${_md(check.archivedAt!)}'
                        : '${_who(check.createdBy)} нээсэн, ${_md(check.createdAt)}',
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpace.sm),
          Icon(AppIcons.forward, color: c.inkDim),
        ],
      ),
    );
  }
}

class _CheckDetail extends ConsumerStatefulWidget {
  const _CheckDetail({
    super.key,
    required this.classId,
    required this.check,
    required this.data,
    required this.saving,
    required this.onBack,
  });

  final String classId;
  final ClassCheck check;
  final ClassChecksData data;
  final Set<String> saving;
  final VoidCallback onBack;

  @override
  ConsumerState<_CheckDetail> createState() => _CheckDetailState();
}

class _CheckDetailState extends ConsumerState<_CheckDetail> {
  _Filter _filter = _Filter.all;

  /// «Үлдсэн/Болсон» шүүлттэй үед дарсан хүүхэд шууд алга болохгүй (андуурч дарвал буцааж болиулна) —
  /// шүүлт солиход л жагсаалт шинэчлэгдэнэ.
  final _sticky = <String>{};
  bool _editing = false;
  String? _confirm; // 'archive' | 'delete'
  bool _busy = false;

  ChecksController get _ctl => ref.read(classChecksProvider(widget.classId).notifier);

  void _setFilter(_Filter f) => setState(() {
    _filter = f;
    _sticky.clear();
  });

  void _toggle(String id) {
    if (_filter != _Filter.all) setState(() => _sticky.add(id));
    _ctl.toggle(widget.check.id, id);
  }

  Future<void> _setArchived(bool value) async {
    setState(() => _busy = true);
    try {
      await _ctl.patch(widget.check.id, {'archived': value});
      if (!mounted) return;
      _snack(context, value ? 'Чекийг нуулаа' : 'Чекийг буцааж гаргалаа');
      setState(() {
        _confirm = null;
        _busy = false;
      });
      if (value) widget.onBack();
    } catch (e) {
      if (mounted) {
        _snack(context, _err(e, 'Хадгалж чадсангүй'));
        setState(() => _busy = false);
      }
    }
  }

  Future<void> _remove() async {
    setState(() => _busy = true);
    try {
      await _ctl.remove(widget.check.id);
      if (!mounted) return;
      _snack(context, 'Чекийг устгалаа');
      widget.onBack();
    } catch (e) {
      if (mounted) {
        _snack(context, _err(e, 'Устгаж чадсангүй'));
        setState(() => _busy = false);
      }
    }
  }

  void _openInfo(CheckPerson p) => CheckStudentSheet.open(context, classId: widget.classId, student: p);

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final check = widget.check;
    final data = widget.data;
    final roster = [...data.students]
      ..sort((a, b) {
        final d = compareMn(a.firstName, b.firstName);
        return d != 0 ? d : compareMn(a.lastName, b.lastName);
      });
    final rosterIds = {for (final p in roster) p.id};
    final names = rosterNames([
      for (final p in [...data.students, ...data.former])
        (id: p.id, firstName: p.firstName, lastName: p.lastName, role: null),
    ]);
    final isBook = check.isBook;
    final archived = check.archived;
    final s = checkSummary(check, rosterIds);
    final marks = {for (final m in check.marks) m.studentId: m};
    final formerChecked = data.former.where((p) => marks[p.id]?.checked ?? false).toList();
    final shown = roster.where((p) {
      if (_filter == _Filter.all || _sticky.contains(p.id)) return true;
      final m = marks[p.id];
      return _filter == _Filter.done ? (m?.checked ?? false) : !(m?.checked ?? false) && !(m?.skipped ?? false);
    }).toList();
    final left = s.left;
    final action = TextButton.styleFrom(
      minimumSize: const Size(teacherTap, teacherTap),
      foregroundColor: c.inkDim,
      padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm),
    );

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.xxl),
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            key: const ValueKey('check-back'),
            style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
            onPressed: widget.onBack,
            icon: const Icon(TeacherIcons.chevronLeft, size: 16),
            label: const Text('Бүх чек'),
          ),
        ),
        if (_editing)
          _CheckForm(
            initialTitle: check.title,
            initialAmount: check.amount,
            fixedBook: isBook,
            submitLabel: AppStrings.save,
            onCancel: () => setState(() => _editing = false),
            onSubmit: (title, amount, _) async {
              // Өөрчлөлтгүй бол серверт явуулахгүй, «Хадгаллаа» гэж худал хэлэхгүй.
              if (title != check.title || amount != check.amount) {
                await _ctl.patch(check.id, {'title': title, 'amount': amount});
                if (context.mounted) _snack(context, 'Хадгаллаа');
              }
              if (mounted) setState(() => _editing = false);
            },
          )
        else
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(check.title, style: context.text.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 2),
                    Text(
                      '${_who(check.createdBy)} нээсэн, ${_md(check.createdAt)}',
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                  ],
                ),
              ),
              if (!archived)
                IconButton(
                  key: const ValueKey('check-edit'),
                  tooltip: isBook ? 'Үнийг засах' : 'Нэр, дүнг засах',
                  constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
                  onPressed: _busy
                      ? null
                      : () => setState(() {
                          _confirm = null;
                          _editing = true;
                        }),
                  icon: Icon(TeacherIcons.pencil, size: 18, color: c.inkDim),
                ),
            ],
          ),
        const SizedBox(height: AppSpace.md),
        DecoratedBox(
          decoration: BoxDecoration(color: c.surfaceSunken, borderRadius: BorderRadius.circular(AppRadius.md)),
          child: Padding(
            padding: const EdgeInsets.all(AppSpace.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Wrap(
                  spacing: AppSpace.md,
                  runSpacing: AppSpace.xs,
                  crossAxisAlignment: WrapCrossAlignment.end,
                  children: [
                    Text.rich(
                      TextSpan(
                        text: '${s.done}',
                        children: [
                          TextSpan(
                            text: '/${s.total}',
                            style: context.text.titleMedium?.copyWith(color: c.inkDim),
                          ),
                        ],
                      ),
                      semanticsLabel: '${s.total}-аас ${s.done} тэмдэглэгдсэн',
                      style: context.text.headlineMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    if (s.collected != null && check.amount != null)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text.rich(
                            TextSpan(
                              text: formatMnt(s.collected!),
                              style: TextStyle(fontWeight: FontWeight.w600, color: c.ink),
                              children: const [TextSpan(text: ' цугларсан')],
                            ),
                            style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                          ),
                          Text(
                            '${isBook ? 'Үнэ' : 'Нэг хүүхэд'} ${formatMnt(check.amount!)}'
                            '${s.skipped > 0 ? ', ${s.skipped} хүүхэд авахгүй' : ''}',
                            style: context.text.bodySmall?.copyWith(color: c.inkDim),
                          ),
                        ],
                      ),
                  ],
                ),
                const SizedBox(height: AppSpace.sm),
                _Progress(value: s.total == 0 ? 0 : s.done / s.total, height: 8),
              ],
            ),
          ),
        ),
        if (archived) ...[
          const SizedBox(height: AppSpace.sm),
          DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(AppRadius.md),
              border: Border.all(color: c.line),
            ),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.xs, AppSpace.xs, AppSpace.xs),
              child: Row(
                children: [
                  Icon(TeacherIcons.eyeOff, size: 16, color: c.inkDim),
                  const SizedBox(width: AppSpace.sm),
                  Expanded(
                    child: Text(
                      'Нуусан, ${_who(check.archivedBy)}, ${check.archivedAt == null ? '' : _md(check.archivedAt!)}',
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                  ),
                  OutlinedButton.icon(
                    key: const ValueKey('check-restore'),
                    style: OutlinedButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                    onPressed: _busy ? null : () => _setArchived(false),
                    icon: const Icon(AppIcons.show, size: 16),
                    label: Text(_busy ? 'Гаргаж байна' : 'Буцааж гаргах'),
                  ),
                ],
              ),
            ),
          ),
        ],
        const SizedBox(height: AppSpace.md),
        if (roster.isNotEmpty) ...[
          SegmentedButton<_Filter>(
            key: const ValueKey('check-filter'),
            segments: [
              ButtonSegment(value: _Filter.all, label: Text('Бүгд ${roster.length}')),
              ButtonSegment(value: _Filter.left, label: Text('Үлдсэн $left')),
              ButtonSegment(value: _Filter.done, label: Text('Болсон ${s.done}')),
            ],
            selected: {_filter},
            showSelectedIcon: false,
            onSelectionChanged: (v) => _setFilter(v.first),
          ),
          const SizedBox(height: AppSpace.sm),
        ],
        if (roster.isEmpty)
          const SizedBox(
            height: 200,
            child: EmptyState(
              icon: TeacherIcons.clipboardCheck,
              title: 'Ангид одоо сурагч алга',
              message: 'Сурагч бүртгэгдэхэд энд жагсана',
            ),
          )
        else if (shown.isEmpty)
          DashedBox(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.xl),
            child: Text(
              _filter == _Filter.done ? 'Тэмдэглэсэн хүүхэд алга' : 'Бүгд болсон',
              textAlign: TextAlign.center,
              style: context.text.bodyMedium?.copyWith(color: c.inkDim),
            ),
          )
        else
          _RowGroup(
            children: [
              for (final p in shown)
                _StudentRow(
                  key: ValueKey('cs-${p.id}'),
                  name: names[p.id] ?? shortName(p.firstName, p.lastName),
                  mark: marks[p.id],
                  saving: widget.saving.contains('${check.id}:${p.id}'),
                  disabled: archived || _busy,
                  book: isBook ? (price: check.amount, readOnly: false) : null,
                  onToggle: () => _toggle(p.id),
                  onInfo: () => _openInfo(p),
                ),
            ],
          ),
        if (formerChecked.isNotEmpty) ...[
          const SizedBox(height: AppSpace.md),
          Text('Ангиас гарсан', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
          const SizedBox(height: AppSpace.xs),
          Opacity(
            opacity: 0.8,
            child: _RowGroup(
              children: [
                for (final p in formerChecked)
                  _StudentRow(
                    name: names[p.id] ?? shortName(p.firstName, p.lastName),
                    mark: marks[p.id],
                    saving: false,
                    disabled: true,
                    book: isBook ? (price: check.amount, readOnly: true) : null,
                    onToggle: () {},
                    onInfo: () => _openInfo(p),
                  ),
              ],
            ),
          ),
        ],
        const SizedBox(height: AppSpace.md),
        if (_editing)
          const SizedBox.shrink()
        else if (_confirm == 'archive')
          _ConfirmBox(
            key: const ValueKey('check-confirm-archive'),
            danger: false,
            body: [
              if (left > 0)
                Text(
                  '$left хүүхэд тэмдэглэгдээгүй байна',
                  style: context.text.bodyMedium?.copyWith(fontWeight: FontWeight.w600, color: c.warning),
                ),
              Text(
                'Нуусан чек «Нуусан» хэсэгт түүхтэйгээ үлдэнэ, хэзээ ч буцааж гаргаж болно',
                style: context.text.bodyMedium,
              ),
            ],
            confirmLabel: _busy ? 'Нууж байна' : 'Тийм, нуух',
            onConfirm: _busy ? null : () => _setArchived(true),
            onCancel: _busy ? null : () => setState(() => _confirm = null),
          )
        else if (_confirm == 'delete')
          _ConfirmBox(
            key: const ValueKey('check-confirm-delete'),
            danger: true,
            body: [
              Text(
                '«${check.title}» чек бүх жагсаалтаас алга болж, буцааж гаргах боломжгүй'
                '${s.done + s.former > 0 ? ' (${s.done + s.former} хүүхэд тэмдэглэгдсэн)' : ''}. '
                '${isBook ? 'Хүүхэд бүрийн төлбөрийн бүртгэл сурагчийн хуудас, «Номын мөнгө» самбарт хэвээр үлдэнэ. Дууссан чекийг устгахын оронд нуухыг зөвлөе' : 'Тэмдэглэгээ нь системд хадгалагдан үлдэнэ'}',
                style: context.text.bodyMedium,
              ),
            ],
            confirmLabel: _busy ? 'Устгаж байна' : 'Тийм, устгах',
            onConfirm: _busy ? null : _remove,
            onCancel: _busy ? null : () => setState(() => _confirm = null),
          )
        else
          Wrap(
            spacing: AppSpace.md,
            children: [
              if (!archived)
                TextButton.icon(
                  key: const ValueKey('check-archive'),
                  style: action,
                  onPressed: _busy ? null : () => setState(() => _confirm = 'archive'),
                  icon: const Icon(TeacherIcons.eyeOff, size: 16),
                  label: const Text('Чекийг нуух'),
                ),
              TextButton.icon(
                key: const ValueKey('check-delete'),
                style: action,
                onPressed: _busy ? null : () => setState(() => _confirm = 'delete'),
                icon: const Icon(AppIcons.trash, size: 16),
                label: const Text('Устгах'),
              ),
            ],
          ),
      ],
    );
  }
}

class _RowGroup extends StatelessWidget {
  const _RowGroup({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ClipRRect(
      borderRadius: BorderRadius.circular(AppRadius.md),
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: c.line),
          borderRadius: BorderRadius.circular(AppRadius.md),
        ),
        child: Column(
          children: [
            for (final (i, w) in children.indexed) ...[if (i > 0) Divider(height: 1, color: c.line), w],
          ],
        ),
      ),
    );
  }
}

class _ConfirmBox extends StatelessWidget {
  const _ConfirmBox({
    super.key,
    required this.danger,
    required this.body,
    required this.confirmLabel,
    required this.onConfirm,
    required this.onCancel,
  });

  final bool danger;
  final List<Widget> body;
  final String confirmLabel;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: danger ? c.error.withValues(alpha: 0.05) : null,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: danger ? c.error.withValues(alpha: 0.4) : c.line),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ...body,
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: AppSpace.sm,
              children: [
                FilledButton(
                  key: const ValueKey('check-confirm'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(teacherTap, teacherTap),
                    backgroundColor: danger ? c.error : null,
                    foregroundColor: danger ? c.onStatus : null,
                  ),
                  onPressed: onConfirm,
                  child: Text(confirmLabel),
                ),
                TextButton(
                  style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                  onPressed: onCancel,
                  child: const Text(AppStrings.cancel),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Нэг сурагч — нэр дээр дарвал товч мэдээлэл (утас г.м.), баруун талын том дугуй хэсэг дээр дарвал
/// тэмдэглэнэ/болиулна (64dp өргөн талбай).
class _StudentRow extends StatelessWidget {
  const _StudentRow({
    super.key,
    required this.name,
    required this.mark,
    required this.saving,
    required this.disabled,
    required this.onToggle,
    required this.onInfo,
    this.book,
  });

  final String name;
  final CheckMark? mark;
  final bool saving;
  final bool disabled;

  /// Номын чек: үнэ (өөр дүнг ялгаж харуулна); readOnly = гарсан сурагч.
  final ({int? price, bool readOnly})? book;
  final VoidCallback onToggle;
  final VoidCallback onInfo;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final m = mark;
    final on = m?.checked ?? false;
    final by = m?.updatedBy?.staff;
    final elsewhere = m?.elsewhere;
    final skipped = m?.skipped ?? false;
    final collector = m?.collectedBy?.staff;
    final stamp = m?.updatedAt == null ? '' : onlineStamp(m!.updatedAt);
    // Номын чек: хэн авсан, дүн (үнээс өөр бол), өөр хүн тэмдэглэсэн бол хэн.
    final List<String>? bookLine = book != null && m != null && (on || skipped)
        ? [
            if (skipped) 'Авахгүй',
            if (elsewhere != null) '${elsewhere.name ?? 'Өөр'} ангид төлсөн',
            if (on && collector != null) '$collector авсан',
            if (on && m.amount != null && (elsewhere != null || m.amount != book!.price)) formatMnt(m.amount!),
            if ((m.note ?? '').isNotEmpty) m.note!,
            if (by != null && (skipped || m.updatedBy?.id != m.collectedBy?.id)) '$by тэмдэглэсэн $stamp' else stamp,
          ]
        : null;
    final locked = disabled || elsewhere != null;
    return ColoredBox(
      color: on ? Color.alphaBlend(c.success.withValues(alpha: 0.1), c.surface) : c.surface,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: 56),
        child: Row(
          children: [
            Expanded(
              child: Semantics(
                button: true,
                label: '$name, мэдээлэл, утас',
                excludeSemantics: true,
                child: InkWell(
                  onTap: onInfo,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpace.md, vertical: AppSpace.sm),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: context.text.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
                        ),
                        if (saving)
                          Text('Хадгалж байна', style: context.text.bodySmall?.copyWith(color: c.inkDim))
                        else if (bookLine != null)
                          Meta(
                            style: context.text.bodySmall?.copyWith(color: c.inkDim),
                            items: bookLine,
                          )
                        else if (book == null && m != null && by != null)
                          Text(
                            '$by $stamp',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: context.text.bodySmall?.copyWith(color: c.inkDim),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            Semantics(
              button: true,
              toggled: on,
              enabled: !locked,
              label: '$name, ${on ? 'тэмдэглэсэн, болиулах' : 'тэмдэглэх'}',
              excludeSemantics: true,
              child: InkWell(
                key: ValueKey('cs-toggle-$name'),
                onTap: locked ? null : onToggle,
                child: SizedBox(
                  width: 64,
                  height: 56,
                  child: Center(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: on ? c.success : Colors.transparent,
                        shape: BoxShape.circle,
                        border: Border.all(color: on ? c.success : c.line, width: 2),
                      ),
                      child: SizedBox.square(
                        dimension: 40,
                        child: on
                            ? Icon(AppIcons.check, size: 20, color: c.onStatus)
                            : skipped
                            ? Icon(TeacherIcons.ban, size: 20, color: c.inkDim)
                            : disabled
                            ? null
                            : Icon(AppIcons.add, size: 20, color: c.inkDim),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Нэр + заавал биш дүн (₮). Шинэ чек: эхлээд төрлөө (ном, шалгалтын хуудас эсвэл бусад) сонгоно.
class _CheckForm extends StatefulWidget {
  const _CheckForm({
    this.initialTitle = '',
    this.initialAmount,
    this.chooseKind = false,
    this.usedBooks = const {},
    this.fixedBook = false,
    required this.submitLabel,
    required this.onSubmit,
    required this.onCancel,
  });

  final String initialTitle;
  final int? initialAmount;
  final bool chooseKind;
  final Set<String> usedBooks;

  /// Номын чекийг засах: нэр солигдохгүй, зөвхөн үнэ.
  final bool fixedBook;
  final String submitLabel;
  final Future<void> Function(String title, int? amount, String? bookKey) onSubmit;
  final VoidCallback onCancel;

  @override
  State<_CheckForm> createState() => _CheckFormState();
}

class _CheckFormState extends State<_CheckForm> {
  /// null = сонгоогүй, 'other' = энгийн чек, бусад нь номын түлхүүр.
  late String? _kind = widget.chooseKind ? null : 'other';
  late final _title = TextEditingController(text: widget.initialTitle);
  late final _amount = TextEditingController(
    text: widget.initialAmount == null || widget.initialAmount == 0
        ? ''
        : ThousandsFormatter.format(widget.initialAmount!),
  );
  bool _busy = false;
  String? _error;

  bool get _isBook => widget.fixedBook || (_kind != null && _kind != 'other');

  @override
  void dispose() {
    _title.dispose();
    _amount.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final t = _isBook ? _title.text : _title.text.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (!_isBook && t.isEmpty) {
      setState(() => _error = 'Чекийн нэрээ бичнэ үү');
      return;
    }
    final digits = _amount.text.replaceAll(RegExp(r'\D'), '');
    final n = digits.isEmpty ? null : int.parse(digits);
    if (_isBook && (n == null || n == 0)) {
      setState(() => _error = 'Үнээ оруулна уу');
      return;
    }
    if (n != null && n > checkAmountMax) {
      setState(() => _error = 'Дүн ${formatMnt(checkAmountMax)}-өөс их байж болохгүй');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.onSubmit(t, n != null && n > 0 ? n : null, _isBook && !widget.fixedBook ? _kind : null);
    } catch (e) {
      if (mounted) setState(() => _error = _err(e, 'Хадгалж чадсангүй'));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final kind = _kind;
    return DecoratedBox(
      key: const ValueKey('check-form'),
      decoration: BoxDecoration(
        color: c.surfaceSunken,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: c.line),
      ),
      child: Padding(
        padding: const EdgeInsets.all(AppSpace.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (widget.chooseKind) ...[
              Text('Ямар чек нээх вэ', style: context.text.labelLarge),
              const SizedBox(height: AppSpace.sm),
              Wrap(
                spacing: AppSpace.xs,
                runSpacing: AppSpace.xs,
                children: [
                  for (final b in [...checkBookKinds, (key: 'other', title: 'Бусад')])
                    ChoiceChip(
                      key: ValueKey('kind-${b.key}'),
                      label: Text(b.title),
                      selected: kind == b.key,
                      tooltip: widget.usedBooks.contains(b.key) ? 'Энэ номын чек энэ ангид нээгдсэн' : null,
                      materialTapTargetSize: MaterialTapTargetSize.padded,
                      onSelected: widget.usedBooks.contains(b.key) || _busy
                          ? null
                          : (_) => setState(() {
                              _kind = b.key;
                              _error = null;
                            }),
                    ),
                ],
              ),
              const SizedBox(height: AppSpace.md),
            ],
            if (kind != null && !_isBook) ...[
              TextField(
                key: const ValueKey('check-title'),
                controller: _title,
                autofocus: true,
                maxLength: checkTitleMax,
                style: const TextStyle(fontSize: 16),
                decoration: const InputDecoration(labelText: 'Нэр', hintText: 'Шалгалтын цаас', counterText: ''),
              ),
              const SizedBox(height: AppSpace.sm),
            ],
            if (kind != null)
              TextField(
                key: const ValueKey('check-amount'),
                controller: _amount,
                autofocus: _isBook,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly, const ThousandsFormatter()],
                style: const TextStyle(fontSize: 16, fontFeatures: [FontFeature.tabularFigures()]),
                decoration: InputDecoration(
                  labelText: _isBook ? 'Үнэ' : 'Нэг хүүхдийн дүн (заавал биш)',
                  hintText: _isBook ? (isSheetKind(kind) ? '3,000' : '40,000') : '25,000',
                  suffixText: '₮',
                ),
              ),
            if (_error != null) ...[
              const SizedBox(height: AppSpace.sm),
              Text(_error!, style: context.text.bodyMedium?.copyWith(color: c.error)),
            ],
            const SizedBox(height: AppSpace.md),
            Wrap(
              spacing: AppSpace.sm,
              children: [
                FilledButton(
                  key: const ValueKey('check-submit'),
                  style: FilledButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                  onPressed: _busy || kind == null ? null : _submit,
                  child: Text(widget.submitLabel),
                ),
                TextButton(
                  style: TextButton.styleFrom(minimumSize: const Size(teacherTap, teacherTap)),
                  onPressed: _busy ? null : widget.onCancel,
                  child: const Text(AppStrings.cancel),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Чекийн жагсаалтаас хүүхдийн нэр дарахад доороос гарах товч мэдээлэл (эзэн 2026-11-10): нэр, код,
/// анги, утаснууд (дарж залгах, хуулах), тэмдэглэл. Төлбөрийн мэдээлэл энд БАЙХГҮЙ — Багш ч харна.
/// Бичвэрийг сонгож хуулж болно (дотоод ажилтан, эзэн 2026-11-10).
class CheckStudentSheet extends ConsumerWidget {
  const CheckStudentSheet({super.key, required this.classId, required this.student});

  final String classId;
  final CheckPerson student;

  static Future<void> open(BuildContext context, {required String classId, required CheckPerson student}) =>
      showModalBottomSheet<void>(
        context: context,
        isScrollControlled: true,
        useSafeArea: true,
        showDragHandle: true,
        builder: (_) => CheckStudentSheet(classId: classId, student: student),
      );

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final c = context.colors;
    final args = (classId: classId, studentId: student.id);
    final async = ref.watch(checkStudentInfoProvider(args));
    final info = async.value;
    final full = info == null
        ? fullNameOf(student.firstName, student.lastName)
        : fullNameOf(info.firstName, info.lastName);
    return SafeArea(
      child: SelectionArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(full, style: context.text.titleMedium),
              const SizedBox(height: 2),
              if (info == null)
                Text('Сурагчийн товч мэдээлэл', style: context.text.bodySmall?.copyWith(color: c.inkDim))
              else
                Meta(
                  style: context.text.bodySmall?.copyWith(color: c.inkDim),
                  items: [
                    info.studentCode ?? 'Кодгүй',
                    if (info.classroomName.isNotEmpty) info.classroomName,
                    if (!info.inClass) 'Ангиас гарсан',
                  ],
                ),
              const SizedBox(height: AppSpace.md),
              if (async.hasError && info == null)
                SizedBox(
                  height: 220,
                  child: ErrorState(
                    message: _err(async.error!, 'Мэдээлэл ачаалж чадсангүй'),
                    onRetry: () => ref.invalidate(checkStudentInfoProvider(args)),
                  ),
                )
              else if (info == null)
                const LoadingState(cards: 2, padding: EdgeInsets.zero)
              else ...[
                if (info.contacts.isEmpty)
                  DashedBox(
                    padding: const EdgeInsets.all(AppSpace.lg),
                    child: Text(
                      'Утасны дугаар бүртгэгдээгүй',
                      textAlign: TextAlign.center,
                      style: context.text.bodyMedium?.copyWith(color: c.inkDim),
                    ),
                  )
                else
                  _RowGroup(children: [for (final ct in info.contacts) _ContactRow(contact: ct)]),
                if ((info.guardianNote ?? '').isNotEmpty) ...[
                  const SizedBox(height: AppSpace.md),
                  DecoratedBox(
                    decoration: BoxDecoration(
                      color: c.surfaceSunken,
                      borderRadius: BorderRadius.circular(AppRadius.md),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(AppSpace.md),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(AppIcons.stickyNote, size: 16, color: c.inkDim),
                          const SizedBox(width: AppSpace.sm),
                          Expanded(child: Text(info.guardianNote!, style: context.text.bodyMedium)),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}

/// «Овог Нэр».
String fullNameOf(String first, String last) => '$last $first'.trim();

class _ContactRow extends StatelessWidget {
  const _ContactRow({required this.contact});

  final CheckContact contact;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ct = contact;
    return ColoredBox(
      color: c.surface,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(AppSpace.md, AppSpace.xs, AppSpace.xs, AppSpace.xs),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(
                      text: ct.label,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      children: [
                        if (ct.name != null)
                          TextSpan(
                            text: ', ${ct.name}',
                            style: const TextStyle(fontWeight: FontWeight.w400),
                          ),
                      ],
                    ),
                    style: context.text.labelMedium?.copyWith(color: c.inkDim),
                  ),
                  Semantics(
                    link: true,
                    label: '${ct.label} руу залгах, ${ct.phone}',
                    excludeSemantics: true,
                    child: InkWell(
                      onTap: () => launchUrl(Uri.parse(ct.telHref)),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: teacherTap),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(TeacherIcons.phone, size: 16, color: c.brand),
                            const SizedBox(width: AppSpace.xs),
                            Text(
                              ct.phone,
                              style: context.text.titleMedium?.copyWith(
                                color: c.brand,
                                fontWeight: FontWeight.w600,
                                fontFeatures: const [FontFeature.tabularFigures()],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  if (ct.appLinked)
                    Row(
                      children: [
                        Icon(TeacherIcons.link2, size: 14, color: c.inkDim),
                        const SizedBox(width: AppSpace.xs),
                        Text('Аппад холбогдсон', style: context.text.bodySmall?.copyWith(color: c.inkDim)),
                      ],
                    ),
                ],
              ),
            ),
            IconButton(
              tooltip: '${ct.ofLabel} дугаар хуулах',
              constraints: const BoxConstraints(minWidth: teacherTap, minHeight: teacherTap),
              icon: Icon(AppIcons.copy, size: 18, color: c.inkDim),
              onPressed: () async {
                await Clipboard.setData(ClipboardData(text: ct.phone));
                if (context.mounted) _snack(context, '${ct.ofLabel} дугаар хуулагдлаа');
              },
            ),
          ],
        ),
      ),
    );
  }
}
