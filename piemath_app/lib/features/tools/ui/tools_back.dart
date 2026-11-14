import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/ui/ui.dart';

/// «Буцах» = өмнөх дэлгэц; гаднаас шууд нээсэн бол хэрэгслийн жагсаалт (RULES §5).
class ToolsBackButton extends StatelessWidget {
  const ToolsBackButton({super.key});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      tooltip: 'Буцах',
      icon: const Icon(AppIcons.back),
      onPressed: () {
        final router = GoRouter.maybeOf(context);
        if (router != null && router.canPop()) {
          router.pop();
        } else if (router != null) {
          router.go('/app/tools');
        } else {
          Navigator.maybePop(context);
        }
      },
    );
  }
}
