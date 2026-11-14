import 'package:flutter/material.dart';

import 'icons.dart';
import 'strings.dart';
import 'tokens.dart';

/// Сүлжээ тасрахад дэлгэцийн доод талд гарах тууз (вэбийн `ConnectionStatus`).
/// Өгөгдөл кэшээс харагдсаар байна — тууз зөвхөн мэдэгдэнэ, хаахгүй.
class ConnectionBanner extends StatelessWidget {
  const ConnectionBanner({super.key, required this.offline});

  final bool offline;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return AnimatedSwitcher(
      duration: AppMotion.of(context, AppMotion.base),
      transitionBuilder: (child, a) => SizeTransition(sizeFactor: a, alignment: Alignment.topCenter, child: child),
      child: !offline
          ? const SizedBox(width: double.infinity)
          : Semantics(
              liveRegion: true,
              child: Material(
                key: const ValueKey('offline'),
                color: c.ink,
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: AppSpace.lg, vertical: AppSpace.md),
                    child: Row(
                      children: [
                        Icon(AppIcons.offline, size: 18, color: c.surface),
                        const SizedBox(width: AppSpace.md),
                        Expanded(
                          child: Text(
                            AppStrings.offlineBanner,
                            style: context.text.bodySmall?.copyWith(color: c.surface),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }
}
