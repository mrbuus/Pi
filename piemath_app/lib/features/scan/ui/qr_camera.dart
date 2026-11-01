import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

/// Камерын алдааны төрөл (монгол тайлбарыг дэлгэц өгнө).
enum QrCameraError { permissionDenied, unsupported, other }

/// QR уншигч камерын хийсвэр давхарга — дэлгэцийг widget тестээр (камергүй) шалгахын тулд.
abstract class QrCamera {
  /// Камерын зураг. [onDetect]-д QR-ийн түүхий бичвэр; [onError]-д алдаа.
  Widget buildPreview(
    BuildContext context, {
    required ValueChanged<String> onDetect,
    required ValueChanged<QrCameraError> onError,
  });

  /// Гар чийдэн: null = боломжгүй, true/false = асаалттай эсэх.
  ValueListenable<bool?> get torch;

  Future<void> toggleTorch();

  void dispose();
}

/// `mobile_scanner` дээр суурилсан бодит камер (Android: ML Kit, iOS: Vision).
class MobileScannerCamera implements QrCamera {
  MobileScannerCamera()
      : _controller = MobileScannerController(
          formats: const [BarcodeFormat.qrCode],
          detectionSpeed: DetectionSpeed.noDuplicates,
        ) {
    _controller.addListener(_sync);
  }

  final MobileScannerController _controller;
  final _torch = ValueNotifier<bool?>(null);

  void _sync() {
    _torch.value = switch (_controller.value.torchState) {
      TorchState.on => true,
      TorchState.off || TorchState.auto => false,
      TorchState.unavailable => null,
    };
  }

  @override
  ValueListenable<bool?> get torch => _torch;

  @override
  Future<void> toggleTorch() => _controller.toggleTorch();

  @override
  Widget buildPreview(
    BuildContext context, {
    required ValueChanged<String> onDetect,
    required ValueChanged<QrCameraError> onError,
  }) {
    return MobileScanner(
      controller: _controller,
      onDetect: (capture) {
        for (final b in capture.barcodes) {
          final raw = b.rawValue;
          if (raw != null && raw.isNotEmpty) {
            onDetect(raw);
            return;
          }
        }
      },
      errorBuilder: (context, error) {
        final kind = switch (error.errorCode) {
          MobileScannerErrorCode.permissionDenied => QrCameraError.permissionDenied,
          MobileScannerErrorCode.unsupported => QrCameraError.unsupported,
          _ => QrCameraError.other,
        };
        WidgetsBinding.instance.addPostFrameCallback((_) => onError(kind));
        return const SizedBox.expand();
      },
    );
  }

  @override
  void dispose() {
    _controller.removeListener(_sync);
    _torch.dispose();
    unawaited(_controller.dispose());
  }
}

/// Тестэд хуурамч камераар солино.
final qrCameraFactoryProvider = Provider<QrCamera Function()>((ref) => MobileScannerCamera.new);
