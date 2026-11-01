/// Төгрөгийн дүн: 2500000 → «2,500,000₮» (вэбийн `formatMnt`).
String formatMnt(num amount) {
  final negative = amount < 0;
  final digits = amount.abs().round().toString();
  final buf = StringBuffer();
  for (var i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 == 0) buf.write(',');
    buf.write(digits[i]);
  }
  return '${negative ? '-' : ''}$buf₮';
}
