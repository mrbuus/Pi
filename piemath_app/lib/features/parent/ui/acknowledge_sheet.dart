import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';
import '../data/parent_repository.dart';

/// «Дүнтэй танилцлаа» — 2 алхам (вэбийн `AcknowledgeResultDialog`): 1) код хүсэх (ХҮҮХДИЙН имэйл рүү
/// очно), 2) 6 оронтой кодоор батлах. Имэйлгүй хүүхэд — серверийн монгол тайлбарыг харуулна.
/// Амжилттай бол true буцаана.
Future<bool> showAcknowledgeSheet(BuildContext context, {required String testResultId, required String title}) async {
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _AcknowledgeSheet(testResultId: testResultId, title: title),
  );
  return ok ?? false;
}

class _AcknowledgeSheet extends ConsumerStatefulWidget {
  const _AcknowledgeSheet({required this.testResultId, required this.title});

  final String testResultId;
  final String title;

  @override
  ConsumerState<_AcknowledgeSheet> createState() => _AcknowledgeSheetState();
}

class _AcknowledgeSheetState extends ConsumerState<_AcknowledgeSheet> {
  final _code = TextEditingController();
  String? _maskedEmail;
  bool _sent = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _request() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final masked = await ref.read(parentRepositoryProvider).requestAck(widget.testResultId);
      if (!mounted) return;
      setState(() {
        _sent = true;
        _maskedEmail = masked;
      });
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    final code = _code.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(code)) {
      setState(() => _error = '6 оронтой кодоо оруулна уу');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await ref.read(parentRepositoryProvider).verifyAck(widget.testResultId, code);
      if (mounted) Navigator.of(context).pop(true);
    } on ApiError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.fromLTRB(
          AppSpace.xl,
          0,
          AppSpace.xl,
          AppSpace.xl + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Дүнтэй танилцах', style: context.text.titleLarge),
            const SizedBox(height: AppSpace.xs),
            MetaTitle(widget.title, style: context.text.bodySmall),
            const SizedBox(height: AppSpace.lg),
            if (!_sent) ...[
              Text('Баталгаажуулах код хүүхдийн бүртгэлтэй имэйл рүү очно.', style: context.text.bodyMedium),
              const SizedBox(height: AppSpace.lg),
              FilledButton(onPressed: _busy ? null : _request, child: Text(_busy ? 'Илгээж байна' : 'Код авах')),
            ] else ...[
              Text(
                _maskedEmail == null ? 'Код илгээгдлээ.' : 'Код $_maskedEmail хаяг руу илгээгдлээ.',
                style: context.text.bodyMedium,
              ),
              const SizedBox(height: AppSpace.md),
              TextField(
                controller: _code,
                keyboardType: TextInputType.number,
                inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(6)],
                decoration: const InputDecoration(labelText: '6 оронтой код'),
                onSubmitted: (_) => _verify(),
              ),
              const SizedBox(height: AppSpace.lg),
              FilledButton(onPressed: _busy ? null : _verify, child: Text(_busy ? 'Шалгаж байна' : 'Батлах')),
              TextButton(onPressed: _busy ? null : _request, child: const Text('Код дахин авах')),
            ],
            if (_error != null) ...[
              const SizedBox(height: AppSpace.md),
              Semantics(
                liveRegion: true,
                child: Text(_error!, style: context.text.bodyMedium?.copyWith(color: context.colors.error)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
