/// Санах ойд байгаа одоогийн токен + хувилбарын тоолуур.
///
/// Токен солигдох (нэвтрэх, гарах, нууц үг солих) бүрт [version] нэмэгдэнэ — явцад
/// байсан хүсэлтийн хариуг хаяж, өөр хэрэглэгчийн мэдээлэл холилдохоос сэргийлнэ.
class TokenHolder {
  String? _token;
  int _version = 0;

  String? get token => _token;
  int get version => _version;

  void set(String? token) {
    if (token == _token) return;
    _token = token;
    _version++;
  }
}
