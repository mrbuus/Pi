import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_client.dart';
import '../network/network_providers.dart';

/// `/files/:key` зургийг (бодлого, хариулт, онол, даалгавар) ачаалах ImageProvider үүсгэгч.
///
/// ГЭРЭЭ (бүх feature үүнийг л ашиглана, гарын үсэг өөрчлөгдөхгүй):
/// `ref.watch(fileImageProvider).image(key)` → [ImageProvider]. 403 нь «эрхгүй» гэсэн хэвийн
/// хариу — `ProblemFigure` тайлбар харуулна (`docs/api-contract/files-uploads.md`).
///
/// Одоогийн хэрэгжүүлэлт энгийн (NetworkImage + Authorization толгой). `homework` feature
/// (core/files эзэн) үүнийг S3 302 redirect (толгойг S3 руу дамжуулахгүй), дискийн кэш,
/// cacheWidth-тэй бүрэн хувилбараар солино — дуудах газрууд өөрчлөгдөхгүй.
class FileImageFactory {
  const FileImageFactory(this._client);

  final ApiClient _client;

  ImageProvider image(String key) =>
      NetworkImage(_client.fileUri(key).toString(), headers: _client.authHeaders());
}

final fileImageProvider = Provider<FileImageFactory>((ref) => FileImageFactory(ref.watch(apiClientProvider)));
