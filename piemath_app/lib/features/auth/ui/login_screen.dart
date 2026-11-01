import 'package:flutter/material.dart';

import '../../../core/ui/ui.dart';

/// Түр нэвтрэх дэлгэц — M1-д бүрэн маягтаар солигдоно (`features/auth`).
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key, this.next, this.message});

  /// Нэвтэрсний дараа очих зам (router-оос, `safeNext`-ээр шүүгдсэн).
  final String? next;

  /// Яагаад нэвтрэх рүү ирсэн (жишээ: нууц үг солигдсон).
  final String? message;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const BrandMark(logoSize: 56),
            const SizedBox(height: AppSpace.xl),
            Text('Нэвтрэх', style: context.text.headlineSmall),
            if (message != null) ...[
              const SizedBox(height: AppSpace.sm),
              Text(message!, style: context.text.bodyMedium?.copyWith(color: context.colors.inkDim)),
            ],
          ],
        ),
      ),
    );
  }
}
