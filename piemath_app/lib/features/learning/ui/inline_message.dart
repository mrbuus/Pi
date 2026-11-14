import 'package:flutter/material.dart';

import '../../../core/network/api_error.dart';
import '../../../core/ui/ui.dart';

/// Маягт доторх богино алдаа/төлөвийн мөр (дүрстэй, өнгөт дэвсгэргүй).
class InlineMessage extends StatelessWidget {
  const InlineMessage(this.text, {super.key, this.icon = AppIcons.error, this.isError = true});

  final String text;
  final IconData icon;
  final bool isError;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      liveRegion: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: isError ? c.error : c.brand),
          const SizedBox(width: AppSpace.sm),
          Expanded(child: Text(text, style: context.text.bodyMedium)),
        ],
      ),
    );
  }
}

/// Алдаанаас хэрэглэгчид харуулах монгол бичвэр.
String errorText(Object e, [String fallback = AppStrings.genericError]) => e is ApiError ? e.message : fallback;
