import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/parent_models.dart';
import '../data/parent_repository.dart';
import '../domain/parent_labels.dart';
import 'child_panel.dart';

/// Эцэг эхийн нүүр (`/app/parent`, вэбийн `app/parent/page.tsx`): хүүхэд сонгох, хүүхдийн самбар,
/// өөр хүүхэд холбох.
class ParentHomeScreen extends ConsumerStatefulWidget {
  const ParentHomeScreen({super.key});

  @override
  ConsumerState<ParentHomeScreen> createState() => _ParentHomeScreenState();
}

class _ParentHomeScreenState extends ConsumerState<ParentHomeScreen> {
  String? _selectedLinkId;

  @override
  Widget build(BuildContext context) {
    final async = ref.watch(parentChildrenProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Хүүхдийн сурах явц')),
      body: async.when(
        skipLoadingOnRefresh: false,
        loading: () => const LoadingState(),
        error: (e, _) => ErrorState(
          message: e is ApiError && e.kind != ApiErrorKind.unknown
              ? e.message
              : 'Хүүхдийн мэдээлэл нээгдсэнгүй. Холболтоо шалгаад дахин оролдоно уу.',
          onRetry: () => ref.invalidate(parentChildrenProvider),
        ),
        data: (links) {
          final selected = links.where((l) => l.id == _selectedLinkId).firstOrNull ?? links.firstOrNull;
          return RefreshIndicator(
            onRefresh: () => ref.refresh(parentChildrenProvider.future).catchError((_) => links),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.gutter, AppSpace.xxl),
              children: [
                const SizedBox(height: AppSpace.xs),
                if (links.length > 1) ...[
                  _ChildSelector(
                    links: links,
                    selectedId: selected?.id,
                    onSelect: (id) => setState(() => _selectedLinkId = id),
                  ),
                  const SizedBox(height: AppSpace.lg),
                ],
                if (selected == null)
                  const AppCard(
                    child: SizedBox(
                      height: 220,
                      child: EmptyState(
                        icon: AppIcons.children,
                        title: 'Холбосон хүүхэд хараахан алга',
                        message: 'Доорх хэсэгт хүүхдийн утасны дугаараар хүсэлт илгээнэ үү.',
                      ),
                    ),
                  )
                else
                  ChildPanel(key: ValueKey(selected.id), link: selected),
                const SizedBox(height: AppSpace.xl),
                _LinkChildCard(hasChildren: links.isNotEmpty),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ChildSelector extends StatelessWidget {
  const _ChildSelector({required this.links, required this.selectedId, required this.onSelect});

  final List<ParentLink> links;
  final String? selectedId;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Хүүхэд сонгох',
      container: true,
      child: Wrap(
        spacing: AppSpace.sm,
        runSpacing: AppSpace.sm,
        children: [
          for (final l in links)
            ChoiceChip(
              label: Text(l.student.firstName.isEmpty ? l.student.fullName : l.student.firstName),
              selected: l.id == selectedId,
              avatar: l.verified ? null : Icon(AppIcons.time, size: 16, color: context.colors.info),
              onSelected: (_) => onSelect(l.id),
            ),
        ],
      ),
    );
  }
}

/// Хүүхэд холбох маягт (`POST /parent/links`).
class _LinkChildCard extends ConsumerStatefulWidget {
  const _LinkChildCard({required this.hasChildren});

  final bool hasChildren;

  @override
  ConsumerState<_LinkChildCard> createState() => _LinkChildCardState();
}

class _LinkChildCardState extends ConsumerState<_LinkChildCard> {
  final _phone = TextEditingController();
  bool _busy = false;
  String? _message;
  bool _failed = false;

  @override
  void initState() {
    super.initState();
    _phone.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _phone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final phone = normalizeStudentPhone(_phone.text);
    if (phone == null) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      await ref.read(parentRepositoryProvider).requestLink(phone);
      _phone.clear();
      if (!mounted) return;
      setState(() {
        _failed = false;
        _message = 'Холболтын хүсэлт илгээгдлээ. Төвийн ажилтан баталгаажуулсны дараа хүүхдийн мэдээлэл харагдана.';
      });
      ref.invalidate(parentChildrenProvider);
    } on ApiError catch (e) {
      if (!mounted) return;
      setState(() {
        _failed = true;
        _message = e.kind == ApiErrorKind.notFound || e.kind == ApiErrorKind.badRequest
            ? e.message
            : 'Хүсэлт илгээгдсэнгүй. Утасны дугаарыг шалгаад дахин оролдоно уу.';
      });
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final valid = normalizeStudentPhone(_phone.text) != null;
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          CardHeader(
            icon: AppIcons.link,
            hue: AppHue.teal,
            title: widget.hasChildren ? 'Өөр хүүхэд холбох' : 'Хүүхэд холбох',
          ),
          const SizedBox(height: AppSpace.md),
          TextField(
            controller: _phone,
            keyboardType: TextInputType.phone,
            autofillHints: const [AutofillHints.telephoneNumber],
            inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(8)],
            decoration: const InputDecoration(labelText: 'Сурагчийн утасны дугаар', prefixIcon: Icon(AppIcons.phone)),
            onSubmitted: (_) => _submit(),
          ),
          const SizedBox(height: AppSpace.md),
          FilledButton(
            onPressed: _busy || !valid ? null : _submit,
            child: Text(_busy ? 'Илгээж байна' : 'Хүсэлт илгээх'),
          ),
          if (_message != null) ...[
            const SizedBox(height: AppSpace.md),
            Semantics(
              liveRegion: true,
              child: Text(
                _message!,
                style: context.text.bodyMedium?.copyWith(color: _failed ? context.colors.error : context.colors.ink),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
