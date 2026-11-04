// `flutter drive`-ийн хост тал: integration_test/perf_test.dart-ын `traceAction` бүрийн timeline-ыг
// build/perf_<reportKey>.timeline.json + .timeline_summary.json болгон бичнэ.
// Ажиллуулах заавар: integration_test/perf_test.dart-ын толгойд.
import 'package:flutter_driver/flutter_driver.dart' as driver;
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() {
  return integrationDriver(
    responseDataCallback: (data) async {
      if (data == null) return;
      for (final entry in data.entries) {
        final timeline = driver.Timeline.fromJson(entry.value as Map<String, dynamic>);
        final summary = driver.TimelineSummary.summarize(timeline);
        await summary.writeTimelineToFile('perf_${entry.key}', pretty: true, includeSummary: true);
      }
    },
  );
}
