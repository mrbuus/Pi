import Flutter
import UIKit

@main
@objc class AppDelegate: FlutterAppDelegate, FlutterImplicitEngineDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  func didInitializeImplicitFlutterEngine(_ engineBridge: FlutterImplicitEngineBridge) {
    GeneratedPluginRegistrant.register(with: engineBridge.pluginRegistry)
    if let registrar = engineBridge.pluginRegistry.registrar(forPlugin: "PiemathExamGuard") {
      ExamGuardPlugin.register(with: registrar)
    }
  }
}

/// Шалгалтын хамгаалалт — Dart тал: lib/core/integrity/method_channel_exam_guard.dart
/// (EXAM-INTEGRITY.md §2).
///
/// iOS-д скриншот ХОРИГЛОХ нийтийн API байхгүй — зөвхөн илрүүлнэ:
/// - `userDidTakeScreenshotNotification` (скриншот авсны ДАРАА) → "screenshot"
/// - `UIScreen.capturedDidChangeNotification` / `isCaptured` (дэлгэц бичлэг, AirPlay,
///   mirroring) → "recordingStarted" / "recordingStopped". Dart тал бичлэгийн үед
///   агуулгыг нууж анхааруулна.
///
/// Project.pbxproj-д шинэ файл нэмэхгүйн тулд энэ файлд байрлуулсан.
final class ExamGuardPlugin: NSObject, FlutterPlugin, FlutterStreamHandler {
  static let methodChannelName = "mn.piemath.app/exam_guard"
  static let eventChannelName = "mn.piemath.app/exam_guard/events"

  private var sink: FlutterEventSink?
  private var active = false
  private var observers: [NSObjectProtocol] = []
  private var lastCaptured = false

  static func register(with registrar: FlutterPluginRegistrar) {
    let instance = ExamGuardPlugin()
    let methods = FlutterMethodChannel(
      name: methodChannelName, binaryMessenger: registrar.messenger())
    registrar.addMethodCallDelegate(instance, channel: methods)
    let events = FlutterEventChannel(
      name: eventChannelName, binaryMessenger: registrar.messenger())
    events.setStreamHandler(instance)
  }

  func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
    switch call.method {
    case "enter":
      enter()
      result(true)
    case "exit":
      exit()
      result(nil)
    default:
      result(FlutterMethodNotImplemented)
    }
  }

  func onListen(
    withArguments arguments: Any?, eventSink events: @escaping FlutterEventSink
  ) -> FlutterError? {
    sink = events
    return nil
  }

  func onCancel(withArguments arguments: Any?) -> FlutterError? {
    sink = nil
    return nil
  }

  private func enter() {
    guard !active else { return }
    active = true
    let center = NotificationCenter.default
    observers.append(
      center.addObserver(
        forName: UIApplication.userDidTakeScreenshotNotification, object: nil, queue: .main
      ) { [weak self] _ in
        self?.emit("screenshot")
      })
    observers.append(
      center.addObserver(
        forName: UIScreen.capturedDidChangeNotification, object: nil, queue: .main
      ) { [weak self] _ in
        self?.captureChanged()
      })
    // Шалгалт эхлэхэд аль хэдийн бичиж байвал шууд мэдэгдэнэ.
    lastCaptured = false
    captureChanged()
  }

  private func exit() {
    guard active else { return }
    active = false
    for observer in observers {
      NotificationCenter.default.removeObserver(observer)
    }
    observers.removeAll()
    lastCaptured = false
  }

  private func isCaptured() -> Bool {
    let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
    if scenes.isEmpty {
      return UIScreen.main.isCaptured
    }
    return scenes.contains { $0.screen.isCaptured }
  }

  private func captureChanged() {
    let captured = isCaptured()
    if captured == lastCaptured { return }
    lastCaptured = captured
    emit(captured ? "recordingStarted" : "recordingStopped")
  }

  private func emit(_ type: String) {
    guard active, let sink = sink else { return }
    sink(["type": type])
  }
}
