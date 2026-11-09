import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/user_role.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../../../shared/payment_status/money.dart';
import '../data/oversight_data.dart';

/// Аудит (`/app/admin/audit`, вэбийн `AuditClient`) — Админ, Багш+. Хэн, юуг, хэзээ, ямар шалтгаанаар өөрчилсөн.
/// Үйлдлээр (чип), объект, хүнээр шүүнэ; мөр дарахад өмнө/дараах утга. Мөнгө, дүнтэй бичлэг тодорно.
class AuditScreen extends ConsumerStatefulWidget {
  const AuditScreen({super.key});

  static const path = '/app/admin/audit';

  @override
  ConsumerState<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends ConsumerState<AuditScreen> {
  String? _entity;
  StaffName? _actor;

  static final _filters = [for (final a in auditActions) DataFilter(a, auditActionLabel(a))];

  Future<DataPage<AuditRow>> _load(DataQuery q) async {
    final page = int.tryParse(q.cursor ?? '') ?? 1;
    final r = await ref
        .read(oversightRepositoryProvider)
        .audit(entity: _entity, action: q.filter, actorId: _actor?.id, page: page);
    return DataPage(items: r.items, total: r.total, nextCursor: page * r.pageSize < r.total ? '${page + 1}' : null);
  }

  Map<String, String> _names() => {
    for (final s in ref.read(auditStaffProvider).value ?? const <StaffName>[]) s.id: s.name,
  };

  Future<void> _pickEntity() async {
    final p = await showSelectSheet<String>(
      context,
      title: 'Объект',
      selected: _entity ?? '',
      options: [const SelectOption('', 'Бүгд'), for (final e in auditEntities) SelectOption(e, e)],
    );
    if (p != null) setState(() => _entity = p.value.isEmpty ? null : p.value);
  }

  Future<void> _pickActor() async {
    final staff = await ref.read(auditStaffProvider.future).catchError((_) => const <StaffName>[]);
    if (!mounted) return;
    final p = await showSelectSheet<String>(
      context,
      title: 'Хэн',
      selected: _actor?.id ?? '',
      options: [const SelectOption('', 'Бүгд'), for (final s in staff) SelectOption(s.id, s.name)],
    );
    if (p != null) setState(() => _actor = p.value.isEmpty ? null : staff.firstWhere((s) => s.id == p.value));
  }

  @override
  Widget build(BuildContext context) {
    final role = ref.watch(oversightRoleProvider);
    final ok = role == UserRole.admin || role == UserRole.teacherPlus;
    if (ok) ref.watch(auditStaffProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Аудит')),
      body: !ok
          ? const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden)
          : DataListScreen<AuditRow>(
              load: _load,
              reloadKey: '${_entity ?? ''}|${_actor?.id ?? ''}',
              itemKey: (r) => r.id,
              filters: _filters,
              countLabel: (n) => '$n бичлэг',
              emptyTitle: 'Бичлэг алга',
              emptyMessage: 'Шүүлтүүрээ өөрчилж үзнэ үү',
              emptyIcon: AppIcons.historyLog,
              header: Padding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, 0),
                child: Wrap(
                  spacing: AppSpace.sm,
                  children: [
                    InputChip(
                      avatar: const Icon(AppIcons.slidersHorizontal, size: 16),
                      label: Text(_entity ?? 'Бүх объект'),
                      onPressed: _pickEntity,
                      onDeleted: _entity == null ? null : () => setState(() => _entity = null),
                    ),
                    InputChip(
                      avatar: const Icon(AppIcons.user, size: 16),
                      label: Text(_actor?.name ?? 'Бүх хүн'),
                      onPressed: _pickActor,
                      onDeleted: _actor == null ? null : () => setState(() => _actor = null),
                    ),
                  ],
                ),
              ),
              onTap: (r) => _showDiff(context, r, _names()),
              itemBuilder: (context, r) {
                final names = _names();
                return ItemRow(
                  title: '${r.entity}, ${auditActionLabel(r.action)}',
                  meta: [
                    names[r.actorId] ?? roleLabel(r.actorRole),
                    if (r.at != null) DateMn.numericWithTime(UbDateTime.fromInstant(r.at!)),
                  ],
                  subtitle: r.reason == null || r.reason!.isEmpty
                      ? null
                      : Text(r.reason!, maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: r.isMoney
                      ? const MetaChip(label: 'Мөнгө', icon: AppIcons.receipt, tone: ChipTone.warning)
                      : r.isGrade
                      ? const MetaChip(label: 'Дүн', icon: AppIcons.medal, tone: ChipTone.info)
                      : null,
                );
              },
            ),
    );
  }
}

String _fmt(String key, Object? v) {
  if (v == null) return '-';
  if (v is bool) return v ? 'Тийм' : 'Үгүй';
  if (v is num) {
    return RegExp(
          'amount|price|paid|shortfall|balance|tuition|outstanding|expected',
          caseSensitive: false,
        ).hasMatch(key)
        ? formatMnt(v)
        : '$v';
  }
  if (v is String) {
    if (v == '[REDACTED]') return 'нууцалсан';
    final t = parseApiInstant(v);
    if (RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}').hasMatch(v) && t != null) {
      return DateMn.numericWithTime(UbDateTime.fromInstant(t));
    }
    return v;
  }
  return '$v';
}

Future<void> _showDiff(BuildContext context, AuditRow r, Map<String, String> names) => showModalBottomSheet<void>(
  context: context,
  isScrollControlled: true,
  useSafeArea: true,
  showDragHandle: true,
  builder: (ctx) => DraggableScrollableSheet(
    expand: false,
    initialChildSize: 0.6,
    maxChildSize: 0.95,
    builder: (ctx, scroll) {
      final diff = r.diff;
      return ListView(
        controller: scroll,
        padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xl),
        children: [
          Text('${r.entity}, ${auditActionLabel(r.action)}', style: ctx.text.titleMedium),
          const SizedBox(height: 2),
          Meta(
            items: [
              names[r.actorId] ?? roleLabel(r.actorRole),
              if (r.at != null) DateMn.numericWithTime(UbDateTime.fromInstant(r.at!)),
              r.entityId,
            ],
          ),
          if (r.reason != null && r.reason!.isNotEmpty) ...[
            const SizedBox(height: AppSpace.sm),
            Text('Шалтгаан: ${r.reason}'),
          ],
          const SectionHeader(title: 'Өөрчлөлт'),
          if (diff.isEmpty)
            Text('Талбарын өөрчлөлт бүртгэгдээгүй', style: ctx.text.bodyMedium?.copyWith(color: ctx.colors.inkDim))
          else
            for (final d in diff)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpace.sm),
                child: AppCard(
                  padding: const EdgeInsets.all(AppSpace.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(auditFieldLabel(d.key), style: ctx.text.labelLarge),
                      const SizedBox(height: 2),
                      Text(
                        'Өмнө: ${_fmt(d.key, d.before)}',
                        style: ctx.text.bodySmall?.copyWith(color: ctx.colors.inkDim),
                      ),
                      Text('Дараа: ${_fmt(d.key, d.after)}', style: ctx.text.bodyMedium),
                    ],
                  ),
                ),
              ),
        ],
      );
    },
  ),
);
