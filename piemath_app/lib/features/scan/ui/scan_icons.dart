import 'package:flutter/widgets.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

/// `scan` feature-ийн нэмэлт Lucide дүрс (AppIcons-д байхгүй). Үндсэн session дараа нэгтгэж болно.
abstract final class ScanIcons {
  static const IconData lock = LucideIcons.lock;
  static const IconData torchOn = LucideIcons.flashlight;
  static const IconData torchOff = LucideIcons.flashlightOff;
  static const IconData keyboard = LucideIcons.keyboard;
  static const IconData cameraOff = LucideIcons.cameraOff;
  static const IconData video = LucideIcons.circlePlay;
  static const IconData imageHint = LucideIcons.image;
}
