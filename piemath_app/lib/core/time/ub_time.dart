/// Улаанбаатарын цаг (UTC+8). Монгол 2017 оноос хойш зуны цаг хэрэглэдэггүй тул
/// тогтмол +8 цаг. Утасны цагийн бүсөөс ҮЛ хамаарна (STATUS §8.9 урхи: сурагч
/// гадаадад байсан ч, утасны бүс буруу ч хуваарь UB-аар).
library;

const ubOffset = Duration(hours: 8);

/// UB-ийн «ханын цаг» — он, сар, өдөр, цаг, минут. [DateTime]-ийн бүсийн төөрөгдлөөс
/// зайлсхийхийн тулд тусдаа төрөл.
class UbDateTime implements Comparable<UbDateTime> {
  UbDateTime._(this._wall);

  /// Агшин (instant)-аас UB-ийн ханын цаг.
  factory UbDateTime.fromInstant(DateTime instant) => UbDateTime._(instant.toUtc().add(ubOffset));

  /// UB-ийн ханын цагаас (жишээ: тест, хуваарийн «2026-11-02 15:00»).
  factory UbDateTime(int year, [int month = 1, int day = 1, int hour = 0, int minute = 0, int second = 0]) =>
      UbDateTime._(DateTime.utc(year, month, day, hour, minute, second));

  /// Одоо (UB).
  factory UbDateTime.now() => UbDateTime.fromInstant(DateTime.now());

  /// Дотор нь UTC тэмдэгтэй боловч утга нь UB-ийн ханын цаг.
  final DateTime _wall;

  int get year => _wall.year;
  int get month => _wall.month;
  int get day => _wall.day;
  int get hour => _wall.hour;
  int get minute => _wall.minute;
  int get second => _wall.second;

  /// Монгол дугаарлалт: 1=Даваа … 7=Ням (Dart-ын `DateTime.weekday`-тэй ижил).
  int get weekday => _wall.weekday;

  /// Жинхэнэ агшин (UTC) — серверт илгээх, харьцуулах.
  DateTime toInstant() => _wall.subtract(ubOffset);

  /// Тухайн өдрийн эхлэл (00:00 UB).
  UbDateTime get startOfDay => UbDateTime(year, month, day);

  /// «2026-11-02» — API-ийн огнооны түлхүүр (`YYYY-MM-DD`).
  String get dateKey => '${year.toString().padLeft(4, '0')}-${_two(month)}-${_two(day)}';

  /// UB-ийн хуанлийн өдрийн дугаар (1970-01-01-ээс) — «өнөөдөр/өчигдөр»-ийг тооцоход.
  int get dayIndex => DateTime.utc(year, month, day).millisecondsSinceEpoch ~/ Duration.millisecondsPerDay;

  UbDateTime add(Duration d) => UbDateTime._(_wall.add(d));

  /// Хуанлийн өдрөөр нэмэх (цагийн бүсгүй тул DST-ийн асуудалгүй).
  UbDateTime addDays(int days) => UbDateTime._(_wall.add(Duration(days: days)));

  bool isSameDay(UbDateTime other) => dayIndex == other.dayIndex;

  @override
  int compareTo(UbDateTime other) => _wall.compareTo(other._wall);

  @override
  bool operator ==(Object other) => other is UbDateTime && other._wall == _wall;

  @override
  int get hashCode => _wall.hashCode;

  @override
  String toString() => '$dateKey ${_two(hour)}:${_two(minute)} UB';
}

/// API-аас ирсэн ISO мөрийг агшин болгоно. `Z`/офсетгүй мөрийг UTC гэж үзнэ
/// (сервер `toISOString()`-оор буцаадаг). Буруу мөр бол null.
DateTime? parseApiInstant(String? iso) {
  if (iso == null || iso.isEmpty) return null;
  final hasZone = RegExp(r'(Z|[+-]\d{2}:?\d{2})$').hasMatch(iso);
  final parsed = DateTime.tryParse(hasZone ? iso : '${iso}Z');
  return parsed?.toUtc();
}

/// API-ийн огноон мөр (`2026-11-02`) — цагийн бүсгүй хуанлийн өдөр (UB гэж үзнэ).
UbDateTime? parseDateKey(String? key) {
  if (key == null) return null;
  final m = RegExp(r'^(\d{4})-(\d{2})-(\d{2})').firstMatch(key);
  if (m == null) return null;
  return UbDateTime(int.parse(m.group(1)!), int.parse(m.group(2)!), int.parse(m.group(3)!));
}

String _two(int v) => v.toString().padLeft(2, '0');
