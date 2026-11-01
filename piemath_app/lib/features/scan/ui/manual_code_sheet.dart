import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/ui/ui.dart';
import '../domain/scan_code.dart';

/// Кодыг гараар бичих (камер ажиллахгүй, зөвшөөрөл өгөөгүй үед). Зөв код бол буцаана.
Future<String?> showManualCodeSheet(BuildContext context) => showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const ManualCodeSheet(),
    );

class ManualCodeSheet extends StatefulWidget {
  const ManualCodeSheet({super.key});

  @override
  State<ManualCodeSheet> createState() => _ManualCodeSheetState();
}

class _ManualCodeSheetState extends State<ManualCodeSheet> {
  final _ctrl = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  void _submit() {
    final code = extractScanCode(_ctrl.text);
    if (code == null) {
      setState(() => _error = 'Код 8 тэмдэгттэй байна (жишээ нь AB12CD34)');
      return;
    }
    Navigator.of(context).pop(code);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
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
          Text('Кодоо бичих', style: context.text.titleMedium),
          const SizedBox(height: AppSpace.xs),
          Text('QR кодын доор бичсэн 8 тэмдэгтийг оруулна уу', style: context.text.bodySmall),
          const SizedBox(height: AppSpace.lg),
          TextField(
            controller: _ctrl,
            autofocus: true,
            textCapitalization: TextCapitalization.characters,
            autocorrect: false,
            enableSuggestions: false,
            maxLength: 40,
            inputFormatters: [FilteringTextInputFormatter.allow(RegExp(r'[A-Za-z0-9\-\s]'))],
            decoration: InputDecoration(
              labelText: 'QR код',
              hintText: 'AB12CD34',
              counterText: '',
              errorText: _error,
            ),
            onChanged: (_) {
              if (_error != null) setState(() => _error = null);
            },
            onSubmitted: (_) => _submit(),
          ),
          const SizedBox(height: AppSpace.lg),
          FilledButton(onPressed: _submit, child: const Text('Бодлого харах')),
        ],
      ),
    );
  }
}
