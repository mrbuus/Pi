import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme_mode.dart';
import '../../../core/ui/ui.dart';
import '../domain/scan_code.dart';
import 'manual_code_sheet.dart';
import 'qr_camera.dart';

/// Номын QR уншигч (`/app/scan`, бүтэн дэлгэц).
///
/// - Камерын зөвшөөрлийг ЗӨВХӨН энд, эхний удаа яагаад хэрэгтэйг тайлбарласны дараа асууна.
/// - Уншсан бичвэрээс зөвхөн `pimath.mn/q/<код>` эсвэл кодыг хүлээн авна — өөр хаяг ХЭЗЭЭ Ч нээхгүй.
/// - Нэг кодыг ойрхон дахин уншихыг шүүнэ (API минутад 30).
/// - Камергүй/зөвшөөрөлгүй бол кодоо гараар бичих.
class ScannerScreen extends ConsumerStatefulWidget {
  const ScannerScreen({super.key});

  /// Камерын тайлбарыг үзсэн эсэх (SharedPreferences, хувийн мэдээлэл биш).
  static const explainedKey = 'scan_camera_explained';

  @override
  ConsumerState<ScannerScreen> createState() => _ScannerScreenState();
}

class _ScannerScreenState extends ConsumerState<ScannerScreen> {
  final _debouncer = ScanDebouncer();
  QrCamera? _camera;
  QrCameraError? _error;
  bool _explained = false;
  bool _foreign = false;

  @override
  void initState() {
    super.initState();
    _explained = ref.read(sharedPreferencesProvider).getBool(ScannerScreen.explainedKey) ?? false;
    if (_explained) _camera = ref.read(qrCameraFactoryProvider)();
  }

  @override
  void dispose() {
    _camera?.dispose();
    super.dispose();
  }

  Future<void> _startCamera() async {
    await ref.read(sharedPreferencesProvider).setBool(ScannerScreen.explainedKey, true);
    if (!mounted) return;
    setState(() {
      _explained = true;
      _camera ??= ref.read(qrCameraFactoryProvider)();
    });
  }

  void _onDetect(String raw) {
    final code = extractScanCode(raw);
    if (code == null) {
      if (!_foreign) setState(() => _foreign = true);
      return;
    }
    if (!_debouncer.accept(code)) return;
    _open(code);
  }

  void _open(String code) => context.go('/app/scan/$code');

  Future<void> _manual() async {
    final code = await showManualCodeSheet(context);
    if (code != null && mounted) _open(code);
  }

  void _close() {
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/');
    }
  }

  @override
  Widget build(BuildContext context) {
    // Камерын дээр ҮРГЭЛЖ бараан дэвсгэр, цайвар бичвэр (горимоос үл хамаарна).
    const dark = AppColors.dark;
    final Widget body;
    if (!_explained) {
      body = _Explain(onStart: _startCamera, onManual: _manual);
    } else if (_error != null) {
      body = _CameraProblem(error: _error!, onManual: _manual);
    } else {
      body = Stack(
        fit: StackFit.expand,
        children: [
          _camera!.buildPreview(
            context,
            onDetect: _onDetect,
            onError: (e) {
              if (mounted && _error == null) setState(() => _error = e);
            },
          ),
          _Overlay(foreign: _foreign, camera: _camera!, onManual: _manual),
        ],
      );
    }
    return Theme(
      data: AppTheme.dark(),
      child: Scaffold(
        backgroundColor: dark.bg,
        appBar: AppBar(
          backgroundColor: dark.bg,
          leading: IconButton(icon: const Icon(AppIcons.close), tooltip: AppStrings.close, onPressed: _close),
          title: const Text('QR код уншуулах'),
        ),
        body: body,
      ),
    );
  }
}

class _Explain extends StatelessWidget {
  const _Explain({required this.onStart, required this.onManual});

  final VoidCallback onStart;
  final VoidCallback onManual;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: AppIcons.camera,
      title: 'Камер хэрэгтэй',
      message:
          'Номын хуудсан дээрх QR кодыг уншихын тулд камерыг ашиглана. '
          'Зураг хадгалагдахгүй, хаашаа ч илгээгдэхгүй.',
      action: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FilledButton.icon(
            icon: const Icon(AppIcons.camera, size: 18),
            label: const Text('Камер нээх'),
            onPressed: onStart,
          ),
          const SizedBox(height: AppSpace.sm),
          TextButton.icon(
            icon: const Icon(AppIcons.keyboard, size: 18),
            label: const Text('Кодоо бичих'),
            onPressed: onManual,
          ),
        ],
      ),
    );
  }
}

class _CameraProblem extends StatelessWidget {
  const _CameraProblem({required this.error, required this.onManual});

  final QrCameraError error;
  final VoidCallback onManual;

  @override
  Widget build(BuildContext context) {
    final (title, message) = switch (error) {
      QrCameraError.permissionDenied => (
        'Камерын зөвшөөрөл алга',
        'Утасныхаа Тохиргоо хэсэгт Piemath-д камер ашиглахыг зөвшөөрнө үү. Эсвэл кодоо гараар бичиж болно.',
      ),
      QrCameraError.unsupported => (
        'Энэ утсанд камер ажиллахгүй байна',
        'QR кодын доор бичсэн 8 тэмдэгтийг гараар оруулж болно.',
      ),
      QrCameraError.other => ('Камер нээгдсэнгүй', 'Дахин оролдох эсвэл кодоо гараар бичнэ үү.'),
    };
    return EmptyState(
      icon: AppIcons.cameraOff,
      title: title,
      message: message,
      action: FilledButton.icon(
        icon: const Icon(AppIcons.keyboard, size: 18),
        label: const Text('Кодоо бичих'),
        onPressed: onManual,
      ),
    );
  }
}

class _Overlay extends StatelessWidget {
  const _Overlay({required this.foreign, required this.camera, required this.onManual});

  final bool foreign;
  final QrCamera camera;
  final VoidCallback onManual;

  @override
  Widget build(BuildContext context) {
    const dark = AppColors.dark;
    final side = (MediaQuery.sizeOf(context).shortestSide * 0.68).clamp(180.0, 320.0);
    return SafeArea(
      child: Column(
        children: [
          const Spacer(),
          ExcludeSemantics(
            child: Container(
              width: side,
              height: side,
              decoration: BoxDecoration(
                border: Border.all(color: dark.brandBright, width: 3),
                borderRadius: BorderRadius.circular(AppRadius.lg),
              ),
            ),
          ),
          const SizedBox(height: AppSpace.lg),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: AppSpace.xl),
            child: _Pill(
              child: Text(
                foreign
                    ? 'Энэ QR код номын бодлогынх биш байна. Номын хуудсан дээрх кодыг уншуулна уу.'
                    : 'Номын хуудсан дээрх QR кодыг хүрээн дотор оруулна уу',
                textAlign: TextAlign.center,
                style: context.text.bodyMedium?.copyWith(color: dark.ink),
              ),
            ),
          ),
          const Spacer(),
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpace.xl),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ValueListenableBuilder<bool?>(
                  valueListenable: camera.torch,
                  builder: (context, on, _) => on == null
                      ? const SizedBox.shrink()
                      : Padding(
                          padding: const EdgeInsets.only(right: AppSpace.md),
                          child: _Pill(
                            child: IconButton(
                              tooltip: on ? 'Гэрэл унтраах' : 'Гэрэл асаах',
                              icon: Icon(on ? AppIcons.flashlight : AppIcons.flashlightOff, color: dark.ink),
                              onPressed: camera.toggleTorch,
                            ),
                          ),
                        ),
                ),
                _Pill(
                  child: TextButton.icon(
                    style: TextButton.styleFrom(foregroundColor: dark.ink),
                    icon: const Icon(AppIcons.keyboard, size: 18),
                    label: const Text('Кодоо бичих'),
                    onPressed: onManual,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  const _Pill({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(color: AppColors.scrim, borderRadius: BorderRadius.circular(AppRadius.lg)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: AppSpace.sm, vertical: AppSpace.xs),
        child: child,
      ),
    );
  }
}
