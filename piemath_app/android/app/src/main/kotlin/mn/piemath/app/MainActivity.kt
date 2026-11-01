package mn.piemath.app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine

class MainActivity : FlutterActivity() {
    private var examGuard: ExamGuardChannel? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        examGuard = ExamGuardChannel(this, flutterEngine.dartExecutor.binaryMessenger)
    }

    override fun cleanUpFlutterEngine(flutterEngine: FlutterEngine) {
        // Шалгалтын дунд activity устсан ч FLAG_SECURE, callback үлдэхгүй.
        examGuard?.dispose()
        examGuard = null
        super.cleanUpFlutterEngine(flutterEngine)
    }
}
