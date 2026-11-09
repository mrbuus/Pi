import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../../../shared/native/native.dart';
import '../data/sms_models.dart';
import '../data/sms_repository.dart';
import '../domain/sms_logic.dart';

/// Мессежийн загвар. Админ нэмж, засна; Багш+ зөвхөн харна. Нууц үг сэргээх загварыг засахгүй.
///
/// Устгах товч санаатайгаар БАЙХГҮЙ: серверийн `DELETE /sms/templates/:id` нь хатуу устгал (RULES §6).
class SmsTemplatesTab extends ConsumerWidget {
  const SmsTemplatesTab({super.key, required this.canManage});

  final bool canManage;

  static List<Widget> _fields({SmsTemplate? t}) => [
    FormTextField(name: 'name', label: 'Загварын нэр', initial: t?.name, required: true, maxLength: 100),
    if (t == null)
      FormSelectField<SmsKind>(
        name: 'kind',
        label: 'Загварын төрөл',
        required: true,
        initial: SmsKind.manual,
        options: [for (final k in SmsKind.creatable) SelectOption(k, k.label)],
      ),
    FormTextField(
      name: 'body',
      label: 'Мессежийн агуулга',
      initial: t?.body,
      required: true,
      maxLines: 5,
      maxLength: 1000,
      validator: templateBodyError,
    ),
  ];

  Future<void> _create(BuildContext context, WidgetRef ref) async {
    final repo = ref.read(smsRepositoryProvider);
    final saved = await showFormSheet<SmsTemplate>(
      context,
      title: 'Шинэ загвар',
      submitLabel: 'Загвар үүсгэх',
      fields: _fields(),
      onSubmit: (v) => repo.createTemplate(name: v.text('name'), body: v.text('body'), kind: v.get<SmsKind>('kind')!),
    );
    if (saved != null) ref.invalidate(smsTemplatesProvider);
  }

  Future<void> _edit(BuildContext context, WidgetRef ref, SmsTemplate t) async {
    final repo = ref.read(smsRepositoryProvider);
    final saved = await showFormSheet<SmsTemplate>(
      context,
      title: 'Загвар засах',
      fields: _fields(t: t),
      onSubmit: (v) => repo.updateTemplate(t.id, name: v.text('name'), body: v.text('body')),
    );
    if (saved != null) ref.invalidate(smsTemplatesProvider);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(smsTemplatesProvider);
    return async.when(
      skipLoadingOnRefresh: true,
      loading: () => const LoadingState(cards: 3),
      error: (e, _) => ErrorState(
        message: e is ApiError ? e.message : 'Загвар ачаалж чадсангүй',
        onRetry: () => ref.invalidate(smsTemplatesProvider),
      ),
      data: (rows) => RefreshIndicator(
        onRefresh: () => ref.refresh(smsTemplatesProvider.future),
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, 0),
              sliver: SliverToBoxAdapter(
                child: SectionHeader(
                  title: '${rows.length} загвар',
                  trailing: canManage
                      ? TextButton.icon(
                          onPressed: () => _create(context, ref),
                          icon: const Icon(AppIcons.add, size: 18),
                          label: const Text('Загвар нэмэх'),
                        )
                      : null,
                ),
              ),
            ),
            if (rows.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: EmptyState(
                  icon: AppIcons.document,
                  title: 'Загвар алга',
                  message: canManage
                      ? 'Шинэ загвар нэмээд илгээх хэсэгт ашиглана'
                      : 'Админ загвар нэмсний дараа энд харагдана',
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(AppSpace.gutter, 0, AppSpace.gutter, AppSpace.xxl),
                sliver: SliverList.separated(
                  itemCount: rows.length,
                  separatorBuilder: (_, _) => const SizedBox(height: AppSpace.md),
                  itemBuilder: (context, i) {
                    final t = rows[i];
                    final editable = canManage && !t.locked;
                    return AppCard(
                      key: ValueKey('tpl:${t.id}'),
                      onTap: editable ? () => _edit(context, ref, t) : null,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text(t.name, style: context.text.titleSmall)),
                              MetaChip(label: t.kindLabel),
                            ],
                          ),
                          const SizedBox(height: AppSpace.sm),
                          Text(t.body, style: context.text.bodyMedium),
                          const SizedBox(height: AppSpace.xs),
                          Meta(
                            items: [
                              '${t.body.length} тэмдэгт',
                              if (t.locked) 'энд засахгүй',
                              if (editable) 'дарж засна',
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }
}
