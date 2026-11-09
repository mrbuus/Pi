import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/shell/app_shell.dart' show AppBackButton;
import '../../../core/network/api_error.dart';
import '../../../core/time/date_mn.dart';
import '../../../core/time/ub_time.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/passes_models.dart';
import '../data/passes_repository.dart';
import 'pass_sheets.dart';

/// `/app/admin/passes/:id` — нэг эрхийн дэлгэрэнгүй (утсан дээр бүтэн дэлгэц, deep link).
class PassDetailScreen extends ConsumerWidget {
  const PassDetailScreen({super.key, required this.passId});

  final String passId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(passesAccessProvider);
    return Scaffold(
      appBar: AppBar(leading: const AppBackButton(), title: const Text('Эрхийн дэлгэрэнгүй')),
      body: access.canView ? PassDetailView(passId: passId) : const PassesDenied(),
    );
  }
}

/// Эрхгүй хэрэглэгчид — айлгахгүй, төвийг сахисан бичвэр. Хүсэлт огт илгээхгүй.
class PassesDenied extends StatelessWidget {
  const PassesDenied({super.key});

  @override
  Widget build(BuildContext context) => const EmptyState(
    icon: AppIcons.secure,
    title: 'Энэ хэсгийг зөвхөн админ удирдана',
    message: 'Эрхийн нөхцөл, олголтыг админ тохируулна',
  );
}

/// «2026.11.04»
String passDay(UbDateTime? d) => d == null ? '' : DateMn.numeric(d);

/// Дэлгэрэнгүйн бие (таблетын баруун тал ба бүтэн дэлгэц): толгой, нөхцөл, эзэмшигчид.
///
/// Тусдаа `GET /passes/:id` байхгүй тул эрхийн жагсаалтаас ([passesListProvider]) олно.
/// Санаатайгаар БАЙХГҮЙ: эрх устгах, олгосныг цуцлах — сервер бүрмөсөн устгадаг (прод өгөгдлийн дүрэм).
class PassDetailView extends ConsumerStatefulWidget {
  const PassDetailView({super.key, required this.passId, this.onChanged});

  final String passId;

  /// Эрх өөрчлөгдсөний дараа (жагсаалтыг шинэчлэх).
  final VoidCallback? onChanged;

  @override
  ConsumerState<PassDetailView> createState() => _PassDetailViewState();
}

class _PassDetailViewState extends ConsumerState<PassDetailView> {
  bool _busy = false;

  void _snack(String text) {
    ScaffoldMessenger.maybeOf(context)
      ?..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  void _changed() {
    ref.invalidate(passesListProvider);
    widget.onChanged?.call();
  }

  Future<void> _edit(PassDef pass) async {
    final saved = await showPassEditor(context, ref, pass: pass);
    if (saved == null || !mounted) return;
    _changed();
    _snack('Эрхийн мэдээлэл шинэчлэгдлээ');
  }

  /// Идэвхжүүлэх / идэвхгүй болгох — баталгаажуулалттай, давхар дарахаас хамгаалсан, автоматаар давтахгүй.
  Future<void> _toggle(PassDef pass) async {
    if (_busy) return;
    final activate = !pass.active;
    final ok = await confirmAction(
      context,
      title: activate ? 'Эрхийг идэвхжүүлэх үү' : 'Эрхийг идэвхгүй болгох уу',
      message: activate
          ? '«${pass.name}» эрхийг сурагчдад дахин олгох боломжтой болно'
          : '«${pass.name}» эрхийг шинээр олгохгүй. Өмнө олгосон эрх хугацаа дуустлаа хүчинтэй хэвээр',
      confirmLabel: activate ? 'Идэвхжүүлэх' : 'Идэвхгүй болгох',
      destructive: false,
    );
    if (!ok || !mounted || _busy) return;
    setState(() => _busy = true);
    try {
      await ref.read(passesRepositoryProvider).setActive(pass.id, active: activate);
      if (!mounted) return;
      _changed();
      _snack(activate ? 'Эрхийг идэвхжүүллээ' : 'Эрхийг идэвхгүй болголоо');
    } catch (e) {
      if (mounted) _snack(passErrorText(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _grant(PassDef pass) async {
    final student = await showGrantSheet(context, pass);
    if (student == null || !mounted) return;
    ref.invalidate(passHoldersProvider(pass.id));
    _changed();
    _snack('${student.name} сурагчид эрх олголоо');
  }

  @override
  Widget build(BuildContext context) {
    final access = ref.watch(passesAccessProvider);
    if (!access.canView) return const PassesDenied();
    return ref
        .watch(passesListProvider)
        .when(
          skipLoadingOnRefresh: true,
          skipLoadingOnReload: true,
          loading: () => const LoadingState(cards: 2),
          error: (e, _) => ErrorState(
            message: e is ApiError ? e.message : AppStrings.genericError,
            onRetry: () => ref.invalidate(passesListProvider),
          ),
          data: (all) {
            final pass = all.where((p) => p.id == widget.passId).firstOrNull;
            if (pass == null) {
              return const EmptyState(
                icon: AppIcons.key,
                title: 'Эрх олдсонгүй',
                message: 'Жагсаалт руу буцаад дахин сонгоно уу',
              );
            }
            return _body(context, pass, access);
          },
        );
  }

  Widget _body(BuildContext context, PassDef pass, PassesAccess access) {
    final c = context.colors;
    return RefreshIndicator(
      color: c.brand,
      backgroundColor: c.surface,
      onRefresh: () async {
        ref
          ..invalidate(passesListProvider)
          ..invalidate(passHoldersProvider(pass.id));
        await ref.read(passHoldersProvider(pass.id).future).catchError((_) => const <PassHolder>[]);
      },
      child: ListView(
        key: const ValueKey('pass-detail'),
        physics: const AlwaysScrollableScrollPhysics(),
        padding: EdgeInsets.only(bottom: AppSpace.xxl + MediaQuery.paddingOf(context).bottom),
        children: [
          DetailHeader(
            title: pass.name,
            subtitle: [pass.durationLabel, pass.priceLabel],
            avatar: const DetailAvatar(icon: AppIcons.key),
            chips: [
              MetaChip(
                label: pass.active ? 'Идэвхтэй' : 'Идэвхгүй',
                icon: pass.active ? AppIcons.success : AppIcons.ban,
                tone: pass.active ? ChipTone.success : ChipTone.neutral,
              ),
              MetaChip(label: '${pass.holdersCount} эзэмшигч', icon: AppIcons.user),
            ],
            primary: access.canGrant && pass.active
                ? DetailAction(
                    label: 'Сурагчид эрх олгох',
                    icon: AppIcons.add,
                    onPressed: _busy ? null : () => unawaited(_grant(pass)),
                  )
                : null,
            secondary: [
              if (access.canEdit) ...[
                DetailAction(
                  label: 'Засах',
                  icon: AppIcons.draft,
                  onPressed: _busy ? null : () => unawaited(_edit(pass)),
                ),
                DetailAction(
                  label: pass.active ? 'Идэвхгүй болгох' : 'Идэвхжүүлэх',
                  icon: pass.active ? AppIcons.ban : AppIcons.success,
                  onPressed: _busy ? null : () => unawaited(_toggle(pass)),
                ),
              ],
            ],
          ),
          if (!pass.active)
            Padding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.md),
              child: Row(
                children: [
                  Icon(AppIcons.info, size: 16, color: c.inkDim),
                  const SizedBox(width: AppSpace.xs),
                  Expanded(
                    child: Text(
                      'Идэвхгүй эрхийг шинээр олгохгүй — идэвхжүүлсний дараа олгоно',
                      style: context.text.bodySmall?.copyWith(color: c.inkDim),
                    ),
                  ),
                ],
              ),
            ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            child: _ScopeCard(scope: pass.scope),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            child: SectionHeader(title: 'Эзэмшигчид'),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.gutter),
            child: PassHoldersList(passId: pass.id),
          ),
        ],
      ),
    );
  }
}

/// Хамрах хүрээ: хураангуй + ID-ууд (сонгож хуулж болно).
class _ScopeCard extends StatelessWidget {
  const _ScopeCard({required this.scope});

  final PassScope scope;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    Widget ids(String label, List<String> list) => Padding(
      padding: const EdgeInsets.only(top: AppSpace.sm),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: context.text.labelMedium?.copyWith(color: c.inkDim)),
          const SizedBox(height: 2),
          SelectableText(list.join(', '), style: context.text.bodySmall),
        ],
      ),
    );
    return AppCard(
      key: const ValueKey('pass-scope'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Хамрах хүрээ', style: context.text.labelMedium?.copyWith(color: c.inkDim)),
          const SizedBox(height: 2),
          Text(scope.summary, style: context.text.titleSmall),
          if (!scope.all) ...[
            if (scope.chapterIds.isNotEmpty) ids('Бүлгийн ID', scope.chapterIds),
            if (scope.bookIds.isNotEmpty) ids('Номын ID', scope.bookIds),
            if (scope.testIds.isNotEmpty) ids('Тестийн ID', scope.testIds),
          ],
        ],
      ),
    );
  }
}

/// Эзэмшигчдийн жагсаалт (`GET /passes/:id/holders`): ачаалж байна / хоосон / алдаа + дахин оролдох.
class PassHoldersList extends ConsumerWidget {
  const PassHoldersList({super.key, required this.passId});

  final String passId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ref
        .watch(passHoldersProvider(passId))
        .when(
          skipLoadingOnRefresh: true,
          loading: () => const SkeletonPulse(child: SkeletonCard()),
          error: (e, _) => ErrorState(
            message: e is ApiError ? e.message : AppStrings.genericError,
            onRetry: () => ref.invalidate(passHoldersProvider(passId)),
          ),
          data: (list) => list.isEmpty
              ? const EmptyState(
                  icon: AppIcons.user,
                  title: 'Одоогоор эзэмшигч алга',
                  message: 'Энэ эрхийг хараахан сурагчид олгоогүй байна',
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final h in list) ...[
                      AppCard(
                        key: ValueKey('holder:${h.id}'),
                        padding: const EdgeInsets.all(AppSpace.md),
                        child: ItemRow(
                          title: h.name,
                          meta: [
                            h.studentCode ?? 'Кодгүй',
                            if (h.startsAt != null || h.expiresAt != null)
                              '${passDay(h.startsAt)} – ${passDay(h.expiresAt)}',
                          ],
                          trailing: MetaChip(
                            label: h.active ? 'Хүчинтэй' : 'Хугацаа дууссан',
                            tone: h.active ? ChipTone.success : ChipTone.neutral,
                          ),
                        ),
                      ),
                      const SizedBox(height: AppSpace.sm),
                    ],
                  ],
                ),
        );
  }
}
