import 'package:go_router/go_router.dart';

/// Feature бүр өөрийн маршрутыг ӨӨРИЙН файлд (`lib/features/<x>/<x>_routes.dart`) зарлана —
/// олон agent зэрэг ажиллахад нэг файл дээр зөрчилдөхгүй. Төв router нь бүгдийг энд нийлүүлнэ.
class FeatureRoutes {
  const FeatureRoutes({this.public = const [], this.shell = const [], this.fullscreen = const []});

  /// Нэвтрэлтгүй (нэвтрэх, нууц үг сэргээх, номын жишиг сорил …).
  final List<RouteBase> public;

  /// Нэвтэрсэн, доод таб / rail-тай бүрхүүл дотор.
  final List<RouteBase> shell;

  /// Нэвтэрсэн боловч бүрхүүлгүй бүтэн дэлгэц (шалгалт өгөх, QR камер).
  final List<RouteBase> fullscreen;
}
