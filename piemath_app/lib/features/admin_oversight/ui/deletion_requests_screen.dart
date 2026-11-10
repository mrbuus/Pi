import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/user_role.dart';
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/oversight_data.dart';

/// Бүртгэл устгах хүсэлт (`/app/admin/deletion-requests`, вэбийн `DeletionRequestsClient`) — Админ.
/// Аппаас ирсэн хүсэлтийг хянах, зөвшөөрөх, татгалзах. Сервер зөвхөн хүсэлтийн төлөвийг солино —
/// хэрэглэгчийн өгөгдлийг хэзээ ч бүр мөсөн устгахгүй.
class DeletionRequestsScreen extends ConsumerStatefulWidget {
  const DeletionRequestsScreen({super.key});

  static const path = '/app/admin/deletion-requests';

  @override
  ConsumerState<DeletionRequestsScreen> createState() => _DeletionRequestsScreenState();
}

class _DeletionRequestsScreenState extends ConsumerState<DeletionRequestsScreen> {
  final _list = DataListController<DeletionRequest>();

  static const _filters = [DataFilter('RESOLVED', 'Шийдвэрлэсэн'), DataFilter('REJECTED', 'Татгалзсан')];

  Future<DataPage<DeletionRequest>> _load(DataQuery q) async {
    // «Нээлттэй» (шүүлтүүргүй) = шинэ ба хянаж буй хүсэлтүүд (серверийн өгөгдмөл)
    final rows = await ref.read(oversightRepositoryProvider).deletionRequests(status: q.filter);
    rows.sort((a, b) => a.status.index.compareTo(b.status.index));
    return DataPage(items: rows, total: rows.length);
  }

  Future<void> _review(DeletionRequest r) async {
    final options = [
      if (r.status == DeletionStatus.pending)
        const SelectOption(DeletionStatus.inReview, 'Хянаж эхлэх', icon: AppIcons.show),
      if (r.status == DeletionStatus.pending || r.status == DeletionStatus.inReview) ...[
        const SelectOption(DeletionStatus.resolved, 'Хүсэлтийг зөвшөөрөх', icon: AppIcons.check),
        const SelectOption(DeletionStatus.rejected, 'Хүсэлтээс татгалзах', icon: AppIcons.ban),
      ],
    ];
    if (options.isEmpty) return;
    final picked = await showSelectSheet<DeletionStatus>(context, title: r.userName, options: options);
    if (picked == null || !mounted) return;
    final saved = await showFormSheet<bool>(
      context,
      title: picked.label,
      subtitle: '${r.userName}, ${roleLabel(r.userRole)}',
      submitLabel: picked.label,
      fields: [FormTextField(name: 'note', label: 'Тэмдэглэл (заавал биш)', initial: r.reviewNote, maxLines: 4)],
      onSubmit: (v) async {
        await ref.read(oversightRepositoryProvider).reviewDeletion(r.id, picked.value, v.text('note'));
        return true;
      },
    );
    if (saved == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Хадгаллаа')));
      await _list.refresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final ok = ref.watch(oversightRoleProvider) == UserRole.admin;
    return Scaffold(
      appBar: AppBar(title: const Text('Устгах хүсэлт')),
      body: !ok
          ? const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden)
          : DataListScreen<DeletionRequest>(
              controller: _list,
              load: _load,
              allFilterLabel: 'Нээлттэй',
              itemKey: (r) => r.id,
              filters: _filters,
              countLabel: (n) => '$n хүсэлт',
              emptyTitle: 'Хүсэлт алга',
              emptyIcon: AppIcons.trash,
              onTap: _review,
              itemBuilder: (context, r) => ItemRow(
                title: r.userName,
                meta: [
                  roleLabel(r.userRole),
                  r.phone,
                  if (r.createdAt != null) DateMn.numeric(UbDateTime.fromInstant(r.createdAt!)),
                ],
                subtitle: r.reason == null || r.reason!.isEmpty ? null : Text(r.reason!),
                trailing: MetaChip(
                  label: r.status.label,
                  tone: switch (r.status) {
                    DeletionStatus.pending => ChipTone.warning,
                    DeletionStatus.inReview => ChipTone.info,
                    DeletionStatus.resolved => ChipTone.success,
                    DeletionStatus.rejected => ChipTone.neutral,
                  },
                ),
              ),
            ),
    );
  }
}

/// Нийтлэг: алдааг монголоор.
String oversightError(Object e) => e is ApiError && e.message.trim().isNotEmpty ? e.message : AppStrings.genericError;
