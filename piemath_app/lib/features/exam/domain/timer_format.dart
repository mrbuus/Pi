/// Үлдсэн хугацааг «05:09» / «1:02:03» хэлбэрээр.
String formatRemaining(int seconds) {
  final s = seconds < 0 ? 0 : seconds;
  final h = s ~/ 3600;
  final m = (s % 3600) ~/ 60;
  final sec = s % 60;
  String two(int v) => v.toString().padLeft(2, '0');
  return h > 0 ? '$h:${two(m)}:${two(sec)}' : '${two(m)}:${two(sec)}';
}

/// Дэлгэц уншигчид: «12 минут 5 секунд».
String spokenRemaining(int seconds) {
  final s = seconds < 0 ? 0 : seconds;
  final h = s ~/ 3600;
  final m = (s % 3600) ~/ 60;
  final sec = s % 60;
  return [if (h > 0) '$h цаг', if (m > 0) '$m минут', if (h == 0 && (sec > 0 || m == 0)) '$sec секунд'].join(' ');
}

/// Хугацааны үргэлжлэл: «12 секунд», «3 минут».
String spokenDuration(Duration d) {
  if (d.inMinutes >= 1) return '${d.inMinutes} минут';
  return '${d.inSeconds} секунд';
}
