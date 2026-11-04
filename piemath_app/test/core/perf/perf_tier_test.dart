import 'package:flutter_test/flutter_test.dart';
import 'package:piemath_app/core/perf/perf_tier.dart';

void main() {
  test('API < 29 → low', () {
    expect(DevicePerf.classify(sdkInt: 28, ramMb: 6000, isLowRamDevice: false), PerfTier.low);
  });

  test('isLowRamDevice → low', () {
    expect(DevicePerf.classify(sdkInt: 33, ramMb: 6000, isLowRamDevice: true), PerfTier.low);
  });

  test('«3GB» утас (totalMem ~2.8GB) → low, «4GB» → high', () {
    expect(DevicePerf.classify(sdkInt: 31, ramMb: 2860, isLowRamDevice: false), PerfTier.low);
    expect(DevicePerf.classify(sdkInt: 31, ramMb: 3700, isLowRamDevice: false), PerfTier.high);
  });

  test('RAM уншигдаагүй (0) бол зөвхөн бусад шинжээр', () {
    expect(DevicePerf.classify(sdkInt: 34, ramMb: 0, isLowRamDevice: false), PerfTier.high);
  });
}
