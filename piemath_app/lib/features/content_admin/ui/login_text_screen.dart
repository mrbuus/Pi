import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/ui/ui.dart';
import '../application/content_providers.dart';
import 'content_widgets.dart';

/// Нэвтрэх хуудасны тайлбар, зарлал (`/app/admin/login-text`, вэбийн `LoginTextEditor`) — Админ.
/// Хоосон хадгалвал нэвтрэх хуудсанд юу ч харагдахгүй.
class LoginTextScreen extends ConsumerWidget {
  const LoginTextScreen({super.key});

  static const path = '/app/admin/login-text';
  static const maxLength = 1000;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final access = ref.watch(contentAccessProvider);
    return Scaffold(
      appBar: AppBar(title: const Text('Нэвтрэх хуудасны бичиг')),
      body: !access.canEditLoginText
          ? const EmptyState(icon: AppIcons.shield, title: AppStrings.forbidden)
          : AsyncBody<String>(
              value: ref.watch(loginTextProvider),
              onRetry: () => ref.invalidate(loginTextProvider),
              errorTitle: 'Тайлбарыг ачаалж чадсангүй',
              data: (body) => _Editor(initial: body),
            ),
    );
  }
}

class _Editor extends ConsumerStatefulWidget {
  const _Editor({required this.initial});

  final String initial;

  @override
  ConsumerState<_Editor> createState() => _EditorState();
}

class _EditorState extends ConsumerState<_Editor> {
  late String _saved = widget.initial;
  late final _text = TextEditingController(text: widget.initial)..addListener(() => setState(() => _error = null));
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      final r = await ref.read(contentRepositoryProvider).saveLoginText(_text.text);
      if (!mounted) return;
      setState(() {
        _saved = r;
        if (_text.text != r) _text.text = r;
      });
      contentSnack(context, 'Хадгаллаа');
    } catch (e) {
      if (mounted) setState(() => _error = contentError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final dirty = _text.text != _saved;
    final over = _text.text.length > LoginTextScreen.maxLength;
    final preview = _text.text.trim();
    return ListView(
      padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.xxl),
      children: [
        Text(
          'Нэвтрэх хуудсын дээд хэсэгт бүх хүнд харагдана. Энгийн текст, мөр шилжүүлж болно',
          style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
        ),
        const SizedBox(height: AppSpace.md),
        TextField(
          controller: _text,
          minLines: 5,
          maxLines: 10,
          decoration: InputDecoration(
            labelText: 'Тайлбар, зарлал',
            alignLabelWithHint: true,
            hintText: 'Жишээ: Шинэ улирлын бүртгэл 9-р сарын 1-нд эхэлнэ',
            helperText: '${_text.text.length} / ${LoginTextScreen.maxLength} тэмдэгт',
            errorText: over ? 'Хэт урт байна' : _error,
          ),
        ),
        const SizedBox(height: AppSpace.md),
        Row(
          children: [
            if (dirty)
              Expanded(
                child: OutlinedButton(onPressed: _busy ? null : () => _text.text = _saved, child: const Text('Буцаах')),
              ),
            if (dirty) const SizedBox(width: AppSpace.sm),
            Expanded(
              child: FilledButton(
                onPressed: _busy || over || !dirty ? null : _save,
                child: Text(_busy ? 'Хадгалж байна' : (dirty ? AppStrings.save : 'Хадгалсан')),
              ),
            ),
          ],
        ),
        const SectionHeader(title: 'Урьдчилан харах'),
        AppCard(
          child: preview.isEmpty
              ? Text(
                  'Хоосон үед нэвтрэх хуудсанд юу ч харагдахгүй',
                  style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim),
                )
              : Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(AppIcons.megaphone, size: 20, color: context.colors.brand),
                    const SizedBox(width: AppSpace.md),
                    Expanded(child: Text(preview)),
                  ],
                ),
        ),
      ],
    );
  }
}
