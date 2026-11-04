package mn.piemath.app

import android.app.Activity
import android.os.Build
import android.view.WindowManager
import android.annotation.TargetApi
import io.flutter.plugin.common.BinaryMessenger
import io.flutter.plugin.common.EventChannel
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import java.util.function.Consumer

/**
 * Шалгалтын хамгаалалт — Dart тал: lib/core/integrity/method_channel_exam_guard.dart
 * (EXAM-INTEGRITY.md §2).
 *
 * - `enter`: FLAG_SECURE (скриншот, дэлгэц бичлэг, «сүүлийн апп»-ын зураг хар болно),
 *   Android 14+ скриншотын callback, Android 15+ бичлэгийн callback.
 * - `exit`: бүгдийг буцаана. Давтан дуудахад аюулгүй.
 * - Үйл явдал (EventChannel): {"type": "screenshot" | "recordingStarted" | "recordingStopped"}.
 */
internal class ExamGuardChannel(
    private val activity: Activity,
    messenger: BinaryMessenger,
) : MethodChannel.MethodCallHandler, EventChannel.StreamHandler {

    private val methods = MethodChannel(messenger, METHOD_CHANNEL)
    private val events = EventChannel(messenger, EVENT_CHANNEL)
    private var sink: EventChannel.EventSink? = null
    private var active = false

    // API 34/35-ын төрлүүдийг хуучин Android дээр ачаалахгүйн тулд Any? хэлбэрээр хадгална.
    private var captureCallback: Any? = null
    private var recordingCallback: Any? = null

    init {
        methods.setMethodCallHandler(this)
        events.setStreamHandler(this)
    }

    override fun onMethodCall(call: MethodCall, result: MethodChannel.Result) {
        when (call.method) {
            "enter" -> {
                enter()
                result.success(true)
            }
            "exit" -> {
                exit()
                result.success(null)
            }
            else -> result.notImplemented()
        }
    }

    override fun onListen(arguments: Any?, events: EventChannel.EventSink?) {
        sink = events
    }

    override fun onCancel(arguments: Any?) {
        sink = null
    }

    private fun enter() {
        if (active) return
        active = true
        activity.runOnUiThread {
            activity.window?.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            registerCaptureCallback()
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            registerRecordingCallback()
        }
    }

    private fun exit() {
        if (!active) return
        active = false
        activity.runOnUiThread {
            activity.window?.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            unregisterCaptureCallback()
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
            unregisterRecordingCallback()
        }
    }

    fun dispose() {
        exit()
        methods.setMethodCallHandler(null)
        events.setStreamHandler(null)
        sink = null
    }

    private fun emit(type: String) {
        activity.runOnUiThread {
            if (active) sink?.success(mapOf("type" to type))
        }
    }

    @TargetApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private fun registerCaptureCallback() {
        if (captureCallback != null) return
        val cb = Activity.ScreenCaptureCallback { emit("screenshot") }
        try {
            activity.registerScreenCaptureCallback(activity.mainExecutor, cb)
            captureCallback = cb
        } catch (ignored: SecurityException) {
            // DETECT_SCREEN_CAPTURE зөвшөөрөлгүй — FLAG_SECURE хангалттай.
        }
    }

    @TargetApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
    private fun unregisterCaptureCallback() {
        val cb = captureCallback as? Activity.ScreenCaptureCallback ?: return
        captureCallback = null
        try {
            activity.unregisterScreenCaptureCallback(cb)
        } catch (ignored: RuntimeException) {
            // Аль хэдийн бүртгэлээс гарсан.
        }
    }

    @TargetApi(Build.VERSION_CODES.VANILLA_ICE_CREAM)
    private fun registerRecordingCallback() {
        if (recordingCallback != null) return
        val wm = activity.getSystemService(WindowManager::class.java) ?: return
        val cb = Consumer<Int> { state ->
            emit(if (state == WindowManager.SCREEN_RECORDING_STATE_VISIBLE) "recordingStarted" else "recordingStopped")
        }
        try {
            val initial = wm.addScreenRecordingCallback(activity.mainExecutor, cb)
            recordingCallback = cb
            if (initial == WindowManager.SCREEN_RECORDING_STATE_VISIBLE) emit("recordingStarted")
        } catch (ignored: SecurityException) {
            // DETECT_SCREEN_RECORDING зөвшөөрөлгүй — FLAG_SECURE бичлэгийг хар болгоно.
        }
    }

    @TargetApi(Build.VERSION_CODES.VANILLA_ICE_CREAM)
    private fun unregisterRecordingCallback() {
        @Suppress("UNCHECKED_CAST")
        val cb = recordingCallback as? Consumer<Int> ?: return
        recordingCallback = null
        try {
            activity.getSystemService(WindowManager::class.java)?.removeScreenRecordingCallback(cb)
        } catch (ignored: RuntimeException) {
            // Аль хэдийн бүртгэлээс гарсан.
        }
    }

    companion object {
        const val METHOD_CHANNEL = "mn.piemath.app/exam_guard"
        const val EVENT_CHANNEL = "mn.piemath.app/exam_guard/events"
    }
}
