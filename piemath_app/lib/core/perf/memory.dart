import 'package:flutter/widgets.dart';

import 'perf_tier.dart';

/// Decode хийсэн зургийн кэшийн хязгаар (`PaintingBinding.imageCache`) — түвшнээр.
///
/// Flutter-ийн өгөгдмөл 100MB / 1000 зураг нь 2 GB утсанд хэт их (Android 8 апп-ыг ~200MB-д
/// хаадаг). Сул төхөөрөмжид 48MB / 300; бусдад өгөгдмөл хэвээр.
({int bytes, int count}) imageCacheLimits(PerfTier tier) =>
    tier.isLow ? (bytes: 48 << 20, count: 300) : (bytes: 100 << 20, count: 1000);

void applyImageCacheLimits(PerfTier tier) {
  final limits = imageCacheLimits(tier);
  PaintingBinding.instance.imageCache
    ..maximumSizeBytes = limits.bytes
    ..maximumSize = limits.count;
}

/// OS санах ойн дарамт мэдэгдэхэд (Android onTrimMemory, iOS memory warning) апп-ын өөрийн
/// санах ойн кэшийг суллана. imageCache-ийг Flutter өөрөө цэвэрлэдэг; диск хэвээр үлдэнэ.
class MemoryPressureObserver with WidgetsBindingObserver {
  MemoryPressureObserver(this.onPressure);

  final List<void Function()> onPressure;

  @override
  void didHaveMemoryPressure() {
    for (final cb in onPressure) {
      try {
        cb();
      } catch (_) {}
    }
  }
}
