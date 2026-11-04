import 'dart:io' show Platform;

import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Төхөөрөмжийн гүйцэтгэлийн түвшин (UX-RESEARCH §8).
///
/// - [low]: Android 8–9 (API < 29: Impeller-ийн Vulkan замгүй, хуучин OpenGL), RAM <= 3GB эсвэл
///   `isLowRamDevice`. Шатлалгүй жагсаалт, зөвхөн гулсах хуудасны шилжилт (opacity давхаргагүй),
///   theme-ийн анимацгүй.
/// - [high]: бусад бүх төхөөрөмж, iOS (зөвхөн Impeller).
enum PerfTier {
  low,
  high;

  bool get isLow => this == PerfTier.low;
}

/// Түвшинг апп асахад НЭГ удаа тодорхойлно (bootstrap), дараа нь өөрчлөгдөхгүй.
abstract final class DevicePerf {
  /// Одоогийн түвшин. Тест, widget-үүд шууд уншина (ажиллах явцад тогтмол).
  static PerfTier tier = PerfTier.high;

  /// «3GB» утасны `totalMem` ~2.7–2.9GB, «4GB» утасных ~3.6GB — хил 3.5GB.
  static const lowRamMb = 3584;

  /// Android-ийн шинжээр түвшинг тооцох цэвэр функц (тестлэгдэнэ).
  @visibleForTesting
  static PerfTier classify({required int sdkInt, required int ramMb, required bool isLowRamDevice}) {
    if (sdkInt < 29 || isLowRamDevice) return PerfTier.low;
    if (ramMb > 0 && ramMb < lowRamMb) return PerfTier.low;
    return PerfTier.high;
  }

  /// Төхөөрөмжийг уншиж [tier]-ийг тогтооно. Алдаа гарвал [PerfTier.high] (апп унахгүй).
  static Future<PerfTier> detect({DeviceInfoPlugin? plugin}) async {
    if (kIsWeb || !Platform.isAndroid) return tier = PerfTier.high;
    try {
      final info = await (plugin ?? DeviceInfoPlugin()).androidInfo;
      return tier = classify(
        sdkInt: info.version.sdkInt,
        ramMb: info.physicalRamSize,
        isLowRamDevice: info.isLowRamDevice,
      );
    } catch (_) {
      return tier = PerfTier.high;
    }
  }
}

/// Riverpod-оор уншихад: `ref.watch(perfTierProvider).isLow`.
final perfTierProvider = Provider<PerfTier>((ref) => DevicePerf.tier);
