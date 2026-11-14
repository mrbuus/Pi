import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../application/staff_providers.dart';
import '../application/teacher_providers.dart';
import '../data/staff_models.dart';
import '../data/staff_repository.dart';

/// Элсэлтийн хүсэлтүүд (`/app/admin/leads`, Админ ба Багш+): төлөв солих (`PATCH /leads/:id/status`).
/// Бүртгэл, засвар вэбээр. Утасны дугаар зөвхөн ажилтанд харагдана.
class LeadsScreen extends ConsumerStatefulWidget {
  const LeadsScreen({super.key});

  @override
  ConsumerState<LeadsScreen> createState() => _LeadsScreenState();
}

class _LeadsScreenState extends ConsumerState<LeadsScreen> {
  LeadStatus _filter = LeadStatus.newLead;

  /// Серверт хадгалагдсан, гэхдээ жагсаалтыг дахин татаагүй төлөв (товшмогц шууд харагдана).
  final _local = <String, LeadStatus>{};
  String? _error;

  Future<void> _set(Lead lead, LeadStatus s) async {
    final before = _local[lead.id];
    setState(() {
      _local[lead.id] = s;
      _error = null;
    });
    try {
      await ref.read(staffRepositoryProvider).setLeadStatus(lead.id, s);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        if (before == null) {
          _local.remove(lead.id);
        } else {
          _local[lead.id] = before;
        }
        _error = errorText(e, 'Төлөв хадгалагдсангүй, дахин оролдоно уу');
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(leadsProvider);
    final c = context.colors;
    return Scaffold(
      appBar: AppBar(title: const Text('Элсэлт')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: errorText(e, 'Элсэлтийн жагсаалт нээгдсэнгүй'),
          onRetry: () => ref.invalidate(leadsProvider),
        ),
        data: (all) {
          final leads = [for (final l in all) _local.containsKey(l.id) ? l.withStatus(_local[l.id]!) : l];
          final count = {for (final s in LeadStatus.values) s: leads.where((l) => l.status == s).length};
          final shown = leads.where((l) => l.status == _filter).toList()
            ..sort((a, b) => (b.createdAt ?? '').compareTo(a.createdAt ?? ''));
          return RefreshIndicator(
            onRefresh: () async {
              _local.clear();
              await ref.refresh(leadsProvider.future).then((_) {}, onError: (_) {});
            },
            child: ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.sm, AppSpace.gutter, AppSpace.xxl),
              children: [
                Wrap(
                  spacing: AppSpace.sm,
                  runSpacing: AppSpace.sm,
                  children: [
                    for (final s in LeadStatus.values)
                      ChoiceChip(
                        label: Text('${s.label} (${count[s]})'),
                        selected: _filter == s,
                        showCheckmark: false,
                        materialTapTargetSize: MaterialTapTargetSize.padded,
                        onSelected: (_) => setState(() => _filter = s),
                      ),
                  ],
                ),
                if (_error != null) ...[
                  const SizedBox(height: AppSpace.sm),
                  Semantics(
                    liveRegion: true,
                    child: Row(
                      children: [
                        Icon(AppIcons.error, size: 18, color: c.error),
                        const SizedBox(width: AppSpace.sm),
                        Expanded(child: Text(_error!, style: context.text.bodySmall)),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: AppSpace.md),
                if (shown.isEmpty)
                  const SizedBox(
                    height: 240,
                    child: EmptyState(icon: AppIcons.enroll, title: 'Энэ төлөвт хүсэлт алга'),
                  )
                else
                  for (final l in shown) ...[_LeadCard(lead: l, onSet: (s) => _set(l, s)), const SizedBox(height: AppSpace.sm)],
              ],
            ),
          );
        },
      ),
    );
  }
}

String _phone(String p) => p.length == 8 ? '${p.substring(0, 4)} ${p.substring(4)}' : p;

class _LeadCard extends StatelessWidget {
  const _LeadCard({required this.lead, required this.onSet});

  final Lead lead;
  final ValueChanged<LeadStatus> onSet;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final at = parseApiInstant(lead.createdAt);
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(lead.name, style: context.text.titleMedium),
          const SizedBox(height: AppSpace.xs),
          Meta(
            style: context.text.bodySmall?.copyWith(color: c.inkDim),
            items: [
              _phone(lead.phone),
              leadSubjectLabel(lead.subject),
              if (lead.grade != null) '${lead.grade}-р анги',
              if (at != null) DateMn.relative(at),
            ],
          ),
          const SizedBox(height: AppSpace.md),
          Wrap(
            spacing: AppSpace.sm,
            runSpacing: AppSpace.sm,
            children: [
              for (final s in LeadStatus.values)
                ChoiceChip(
                  label: Text(s.label),
                  selected: lead.status == s,
                  showCheckmark: false,
                  materialTapTargetSize: MaterialTapTargetSize.padded,
                  onSelected: lead.status == s ? null : (_) => onSet(s),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
