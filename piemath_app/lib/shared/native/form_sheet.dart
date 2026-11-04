import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../core/network/api_error.dart';
import '../../core/time/date_mn.dart';
import '../../core/time/ub_time.dart';
import '../../core/time/weekday.dart';
import '../../core/ui/ui.dart';
import '../payment_status/money.dart';
import 'confirm.dart';
import 'select_sheet.dart';

/// Маягтын шалгалтын монгол мессежүүд (төгсгөлд цэггүй). Дэлгэцүүд өөрсдийн validator-т ч хэрэглэнэ.
abstract final class FormMessages {
  static const required = 'Заавал бөглөнө үү';
  static const choose = 'Нэгийг сонгоно уу';
  static const chooseAtLeastOne = 'Дор хаяж нэгийг сонгоно уу';
  static const number = 'Зөвхөн тоо оруулна уу';
  static const wholeNumber = 'Бүхэл тоо оруулна уу';
  static const phone = 'Утасны дугаар 8 оронтой байна';
  static const money = 'Дүнгээ зөв оруулна уу';
  static const date = 'Огноо сонгоно уу';
  static const time = 'Цаг сонгоно уу';
  static const saveFailed = 'Хадгалж чадсангүй. Дахин оролдоно уу';
  static const unsavedTitle = 'Хадгалаагүй өөрчлөлт байна';
  static const unsavedMessage = 'Хаавал оруулсан мэдээлэл хадгалагдахгүй';
  static const discard = 'Хаах';
  static const keepEditing = 'Үргэлжлүүлэх';
  static const saving = 'Хадгалж байна';

  static String min(num v) => 'Хамгийн багадаа $v';
  static String max(num v) => 'Хамгийн ихдээ $v';
  static String maxLength(int n) => '$n тэмдэгтээс ихгүй';
}

/// [FormSheet]-ийн талбаруудын утга (талбарын `name` → утга).
@immutable
class FormValues {
  FormValues(Map<String, Object?> values) : _values = Map.unmodifiable(values);

  final Map<String, Object?> _values;

  Object? operator [](String name) => _values[name];

  bool has(String name) => _values.containsKey(name);

  /// Төрөл таарахгүй эсвэл байхгүй бол `null`.
  T? get<T>(String name) {
    final v = _values[name];
    return v is T ? v : null;
  }

  /// Бичвэр (зайг тайрсан, хоосон бол '').
  String text(String name) => (get<String>(name) ?? '').trim();

  int? integer(String name) => get<num>(name)?.toInt();

  num? number(String name) => get<num>(name);

  bool boolean(String name) => _values[name] == true;

  UbDateTime? date(String name) => get<UbDateTime>(name);

  TimeOfDay? time(String name) => get<TimeOfDay>(name);

  /// Олон сонголтын утга.
  Set<T> many<T>(String name) => (get<Set<Object?>>(name) ?? const {}).whereType<T>().toSet();

  Map<String, Object?> toMap() => _values;
}

/// Доороос гарах маягт: гарчиг, талбарууд, «Хадгалах». Амжилттай бол [onSubmit]-ийн үр дүнг буцаана,
/// хаавал `null`. Хадгалаагүй өөрчлөлттэй хаах гэвэл «Хадгалаагүй өөрчлөлт байна» гэж асууна.
///
/// ```dart
/// final saved = await showFormSheet<Student>(
///   context,
///   title: 'Сурагч засах',
///   fields: [
///     FormTextField(name: 'name', label: 'Нэр', initial: s.name, required: true),
///     FormPhoneField(name: 'phone', label: 'Утас', initial: s.phone),
///     FormMoneyField(name: 'fee', label: 'Сарын төлбөр', initial: s.fee),
///   ],
///   onSubmit: (v) => repo.update(s.id, name: v.text('name'), phone: v.text('phone'), fee: v.integer('fee')),
/// );
/// ```
Future<R?> showFormSheet<R>(
  BuildContext context, {
  required String title,
  required List<Widget> fields,
  required Future<R> Function(FormValues values) onSubmit,
  String? subtitle,
  String submitLabel = AppStrings.save,
  double? initialSize,
}) {
  return showModalBottomSheet<R>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    // Чирэлтийг DraggableScrollableSheet өөрөө авна — хадгалаагүй өөрчлөлтийг асуухын тулд.
    enableDrag: false,
    showDragHandle: false,
    backgroundColor: Colors.transparent,
    elevation: 0,
    builder: (_) => FormSheet<R>(
      title: title,
      subtitle: subtitle,
      fields: fields,
      onSubmit: onSubmit,
      submitLabel: submitLabel,
      initialSize: initialSize,
    ),
  );
}

/// [showFormSheet]-ийн дотор талын widget (өөрийн route-д ч ашиглаж болно).
class FormSheet<R> extends StatefulWidget {
  const FormSheet({
    super.key,
    required this.title,
    required this.fields,
    required this.onSubmit,
    this.subtitle,
    this.submitLabel = AppStrings.save,
    this.initialSize,
  });

  final String title;
  final String? subtitle;
  final List<Widget> fields;
  final Future<R> Function(FormValues values) onSubmit;
  final String submitLabel;

  /// Анх нээгдэх өндөр (дэлгэцийн хувь). Өгөөгүй бол 3-аас цөөн талбартай бол [midSize], эс бөгөөс [maxSize].
  final double? initialSize;

  /// Энэ хүртэл доош чирвэл хаах оролдлого.
  static const minSize = 0.25;

  /// Дунд зогсох цэг.
  static const midSize = 0.6;
  static const maxSize = 0.94;

  @override
  State<FormSheet<R>> createState() => FormSheetState<R>();
}

class FormSheetState<R> extends State<FormSheet<R>> {
  final _formKey = GlobalKey<FormState>();
  final _sheet = DraggableScrollableController();
  final _values = <String, Object?>{};
  final _initial = <String, Object?>{};
  bool _busy = false;
  bool _submitted = false;
  bool _closing = false;
  bool _asking = false;
  bool _dragClose = false;
  String? _error;

  double get _initialSize => widget.initialSize ?? (widget.fields.length <= 3 ? FormSheet.midSize : FormSheet.maxSize);

  /// Анхны утгаас өөрчлөгдсөн талбартай эсэх.
  bool get isDirty => _values.keys.any((k) => !_same(_values[k], _initial[k]));

  bool get isBusy => _busy;

  /// Одоогийн утгууд.
  FormValues get values => FormValues(_values);

  static bool _same(Object? a, Object? b) {
    if (a is Set && b is Set) return a.length == b.length && a.containsAll(b);
    if (a is String && b == null) return a.isEmpty;
    if (b is String && a == null) return b.isEmpty;
    return a == b;
  }

  void _register(String name, Object? initial) {
    if (_initial.containsKey(name)) return;
    _initial[name] = initial;
    _values[name] = initial;
  }

  void _set(String name, Object? value) {
    final wasDirty = isDirty;
    _values[name] = value;
    if (_error != null || wasDirty != isDirty) setState(() => _error = null);
  }

  @override
  void dispose() {
    _sheet.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      _submitted = true;
      _error = null;
    });
    if (!(_formKey.currentState?.validate() ?? false)) {
      unawaited(HapticFeedback.lightImpact());
      return;
    }
    setState(() => _busy = true);
    try {
      final result = await widget.onSubmit(values);
      if (!mounted) return;
      unawaited(HapticFeedback.mediumImpact());
      _closing = true;
      Navigator.of(context).pop(result);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e is ApiError ? e.message : FormMessages.saveFailed;
      });
    }
  }

  Future<void> _onPopBlocked() async {
    if (_busy || _closing || _asking) return;
    _asking = true;
    final discard = await confirmAction(
      context,
      title: FormMessages.unsavedTitle,
      message: FormMessages.unsavedMessage,
      confirmLabel: FormMessages.discard,
      cancelLabel: FormMessages.keepEditing,
    );
    _asking = false;
    if (!mounted) return;
    if (discard) {
      _closing = true;
      Navigator.of(context).pop();
      return;
    }
    // Доош чирсэн бол буцаад дээш.
    if (_sheet.isAttached && _sheet.size < _initialSize - 0.01) {
      if (AppMotion.reduced(context)) {
        _sheet.jumpTo(_initialSize);
      } else {
        await _sheet.animateTo(_initialSize, duration: AppMotion.enter, curve: AppEasing.decelerate);
      }
    }
  }

  bool _onSheetExtent(DraggableScrollableNotification n) {
    // Доод цэг хүртэл чирвэл НЭГ удаа хаах оролдлого; дахин дээш гарвал дахин зөвшөөрнө.
    if (n.extent <= FormSheet.minSize + 0.01) {
      if (!_dragClose && !_closing && !_asking) {
        _dragClose = true;
        unawaited(Navigator.of(context).maybePop());
      }
    } else if (n.extent > FormSheet.minSize + 0.05) {
      _dragClose = false;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final reduced = AppMotion.reduced(context);
    final initial = _initialSize;
    return PopScope<R>(
      canPop: !_busy && !isDirty,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) unawaited(_onPopBlocked());
      },
      child: Padding(
        // Гар гарахад маягт дээшилнэ.
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
        child: NotificationListener<DraggableScrollableNotification>(
          onNotification: _onSheetExtent,
          child: DraggableScrollableSheet(
            controller: _sheet,
            expand: false,
            initialChildSize: initial,
            minChildSize: FormSheet.minSize,
            maxChildSize: FormSheet.maxSize,
            snap: true,
            snapSizes: [
              if (initial > FormSheet.midSize + 0.01 && initial < FormSheet.maxSize) initial,
              FormSheet.midSize,
            ]..sort(),
            snapAnimationDuration: reduced ? const Duration(milliseconds: 1) : AppMotion.enter,
            builder: (context, scroll) => Material(
              color: c.surface,
              shape: const RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
              ),
              clipBehavior: Clip.antiAlias,
              child: _FormSheetScope(
                state: this,
                child: Column(
                  children: [
                    Expanded(
                      child: Form(
                        key: _formKey,
                        autovalidateMode: _submitted ? AutovalidateMode.onUserInteraction : AutovalidateMode.disabled,
                        child: AbsorbPointer(
                          absorbing: _busy,
                          child: CustomScrollView(
                            controller: scroll,
                            slivers: [
                              PinnedHeaderSliver(child: _header(context)),
                              SliverPadding(
                                padding: const EdgeInsets.fromLTRB(
                                  AppSpace.gutter,
                                  AppSpace.xs,
                                  AppSpace.gutter,
                                  AppSpace.lg,
                                ),
                                sliver: SliverList.separated(
                                  itemCount: widget.fields.length,
                                  separatorBuilder: (_, _) => const SizedBox(height: AppSpace.lg),
                                  itemBuilder: (_, i) => widget.fields[i],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    _submitBar(context),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _header(BuildContext context) {
    final c = context.colors;
    return ColoredBox(
      color: c.surface,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: AppSpace.sm),
          ExcludeSemantics(
            child: Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(color: c.line, borderRadius: BorderRadius.circular(AppRadius.pill)),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.xs, AppSpace.xs, AppSpace.sm),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Semantics(header: true, child: Text(widget.title, style: context.text.titleLarge)),
                      if (widget.subtitle != null) Text(widget.subtitle!, style: context.text.bodySmall),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: AppStrings.close,
                  icon: const Icon(AppIcons.close),
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _submitBar(BuildContext context) {
    final c = context.colors;
    final bottom = MediaQuery.viewPaddingOf(context).bottom;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.surface,
        border: Border(top: BorderSide(color: c.line)),
      ),
      child: Padding(
        padding: EdgeInsets.fromLTRB(AppSpace.gutter, AppSpace.md, AppSpace.gutter, AppSpace.md + bottom),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null) ...[
              Semantics(
                liveRegion: true,
                child: Row(
                  children: [
                    Icon(AppIcons.error, size: 18, color: c.error),
                    const SizedBox(width: AppSpace.sm),
                    Expanded(
                      child: Text(_error!, style: context.text.bodySmall?.copyWith(color: c.error)),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpace.sm),
            ],
            FilledButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox.square(
                          dimension: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: c.inkDim),
                        ),
                        const SizedBox(width: AppSpace.sm),
                        const Text(FormMessages.saving),
                      ],
                    )
                  : Text(widget.submitLabel),
            ),
          ],
        ),
      ),
    );
  }
}

class _FormSheetScope extends InheritedWidget {
  const _FormSheetScope({required this.state, required super.child});

  final FormSheetState<Object?> state;

  @override
  bool updateShouldNotify(_FormSheetScope old) => false;
}

/// Талбарын нийтлэг суурь: FormSheet-д бүртгүүлж утгаа өгнө, [FormField]-ийн шалгалттай.
/// FormSheet-ээс гадна ([Form] дотор) ч ажиллана — утгыг [onChanged]-аар авна.
class _SheetField<V> extends StatefulWidget {
  const _SheetField({
    required this.name,
    required this.initial,
    required this.validator,
    required this.builder,
    required this.enabled,
    this.onChanged,
  });

  final String name;
  final V? initial;
  final String? Function(V? value)? validator;
  final bool enabled;
  final ValueChanged<V?>? onChanged;
  final Widget Function(BuildContext context, FormFieldState<V> field, void Function(V? value) set, bool enabled)
  builder;

  @override
  State<_SheetField<V>> createState() => _SheetFieldState<V>();
}

class _SheetFieldState<V> extends State<_SheetField<V>> {
  FormSheetState<Object?>? _scope;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_scope != null) return;
    _scope = context.getInheritedWidgetOfExactType<_FormSheetScope>()?.state;
    _scope?._register(widget.name, widget.initial);
  }

  @override
  Widget build(BuildContext context) {
    final busy = _scope?.isBusy ?? false;
    return FormField<V>(
      initialValue: widget.initial,
      validator: widget.validator,
      enabled: widget.enabled,
      builder: (field) => widget.builder(context, field, (v) {
        field.didChange(v);
        _scope?._set(widget.name, v);
        widget.onChanged?.call(v);
      }, widget.enabled && !busy),
    );
  }
}

/// Бичвэр дээр суурилсан талбар (текст, тоо, утас, мөнгө).
class _TextSheetField<V> extends StatefulWidget {
  const _TextSheetField({
    super.key,
    required this.name,
    required this.label,
    required this.initial,
    required this.parse,
    required this.format,
    required this.validate,
    this.hint,
    this.helper,
    this.keyboardType,
    this.inputFormatters,
    this.maxLines = 1,
    this.maxLength,
    this.prefixIcon,
    this.suffixText,
    this.enabled = true,
    this.textCapitalization = TextCapitalization.none,
    this.onChanged,
  });

  final String name;
  final String label;
  final V? initial;
  final V? Function(String text) parse;
  final String Function(V value) format;

  /// Бичвэр ба задалсан утгаар шалгана.
  final String? Function(String text, V? value) validate;
  final String? hint;
  final String? helper;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final int maxLines;
  final int? maxLength;
  final IconData? prefixIcon;
  final String? suffixText;
  final bool enabled;
  final TextCapitalization textCapitalization;
  final ValueChanged<V?>? onChanged;

  @override
  State<_TextSheetField<V>> createState() => _TextSheetFieldState<V>();
}

class _TextSheetFieldState<V> extends State<_TextSheetField<V>> {
  late final _controller = TextEditingController(
    text: widget.initial == null ? '' : widget.format(widget.initial as V),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return _SheetField<V>(
      name: widget.name,
      initial: widget.initial,
      enabled: widget.enabled,
      onChanged: widget.onChanged,
      validator: (_) => widget.validate(_controller.text, widget.parse(_controller.text)),
      builder: (context, field, set, enabled) => TextField(
        controller: _controller,
        enabled: enabled,
        keyboardType: widget.keyboardType,
        inputFormatters: widget.inputFormatters,
        maxLines: widget.maxLines,
        minLines: 1,
        maxLength: widget.maxLength,
        textCapitalization: widget.textCapitalization,
        scrollPadding: const EdgeInsets.all(AppSpace.xxl * 3),
        onChanged: (text) => set(widget.parse(text)),
        decoration: InputDecoration(
          labelText: widget.label,
          hintText: widget.hint,
          helperText: widget.helper,
          errorText: field.errorText,
          errorMaxLines: 2,
          suffixText: widget.suffixText,
          prefixIcon: widget.prefixIcon == null ? null : Icon(widget.prefixIcon, size: 20),
        ),
      ),
    );
  }
}

/// Энгийн бичвэр. Утга: `String`.
class FormTextField extends StatelessWidget {
  const FormTextField({
    super.key,
    required this.name,
    required this.label,
    this.initial,
    this.hint,
    this.helper,
    this.required = false,
    this.maxLines = 1,
    this.maxLength,
    this.validator,
    this.enabled = true,
    this.onChanged,
  });

  final String name;
  final String label;
  final String? initial;
  final String? hint;
  final String? helper;
  final bool required;
  final int maxLines;
  final int? maxLength;

  /// Нэмэлт шалгалт (хоосон биш үед). Алдааны монгол мессеж эсвэл `null`.
  final String? Function(String value)? validator;
  final bool enabled;
  final ValueChanged<String?>? onChanged;

  @override
  Widget build(BuildContext context) {
    return _TextSheetField<String>(
      name: name,
      label: label,
      initial: initial,
      hint: hint,
      helper: helper,
      maxLines: maxLines,
      maxLength: maxLength,
      enabled: enabled,
      onChanged: onChanged,
      keyboardType: maxLines > 1 ? TextInputType.multiline : TextInputType.text,
      textCapitalization: TextCapitalization.sentences,
      parse: (t) => t,
      format: (v) => v,
      validate: (text, _) {
        final t = text.trim();
        if (t.isEmpty) return required ? FormMessages.required : null;
        if (maxLength != null && t.length > maxLength!) return FormMessages.maxLength(maxLength!);
        return validator?.call(t);
      },
    );
  }
}

/// Тоо. Утга: `int` ([decimal] = false) эсвэл `num`.
class FormNumberField extends StatelessWidget {
  const FormNumberField({
    super.key,
    required this.name,
    required this.label,
    this.initial,
    this.hint,
    this.helper,
    this.required = false,
    this.decimal = false,
    this.min,
    this.max,
    this.suffixText,
    this.enabled = true,
    this.onChanged,
  });

  final String name;
  final String label;
  final num? initial;
  final String? hint;
  final String? helper;
  final bool required;
  final bool decimal;
  final num? min;
  final num? max;

  /// «оноо», «мин» гэх мэт нэгж.
  final String? suffixText;
  final bool enabled;
  final ValueChanged<num?>? onChanged;

  static num? parseNumber(String text, {required bool decimal}) {
    final t = text.trim().replaceAll(',', '.');
    if (t.isEmpty) return null;
    return decimal ? num.tryParse(t) : int.tryParse(t);
  }

  @override
  Widget build(BuildContext context) {
    return _TextSheetField<num>(
      name: name,
      label: label,
      initial: initial,
      hint: hint,
      helper: helper,
      suffixText: suffixText,
      enabled: enabled,
      onChanged: onChanged,
      keyboardType: TextInputType.numberWithOptions(decimal: decimal, signed: (min ?? 0) < 0),
      inputFormatters: [FilteringTextInputFormatter.allow(RegExp(decimal ? r'[-0-9.,]' : r'[-0-9]'))],
      parse: (t) => parseNumber(t, decimal: decimal),
      format: (v) => decimal ? '$v' : '${v.toInt()}',
      validate: (text, value) {
        if (text.trim().isEmpty) return required ? FormMessages.required : null;
        if (value == null) return decimal ? FormMessages.number : FormMessages.wholeNumber;
        if (min != null && value < min!) return FormMessages.min(min!);
        if (max != null && value > max!) return FormMessages.max(max!);
        return null;
      },
    );
  }
}

/// Утасны дугаар — 8 оронтой. Утга: `String` (зөвхөн цифр).
class FormPhoneField extends StatelessWidget {
  const FormPhoneField({
    super.key,
    required this.name,
    this.label = 'Утасны дугаар',
    this.initial,
    this.required = false,
    this.enabled = true,
    this.onChanged,
  });

  final String name;
  final String label;
  final String? initial;
  final bool required;
  final bool enabled;
  final ValueChanged<String?>? onChanged;

  static const length = 8;

  @override
  Widget build(BuildContext context) {
    return _TextSheetField<String>(
      name: name,
      label: label,
      initial: initial?.replaceAll(RegExp(r'\D'), ''),
      prefixIcon: AppIcons.phone,
      enabled: enabled,
      onChanged: onChanged,
      keyboardType: TextInputType.phone,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(length)],
      parse: (t) => t,
      format: (v) => v,
      validate: (text, _) {
        final t = text.trim();
        if (t.isEmpty) return required ? FormMessages.required : null;
        return t.length == length ? null : FormMessages.phone;
      },
    );
  }
}

/// Мянгатын таслалтай бичвэр (2500000 → «2,500,000»).
class ThousandsFormatter extends TextInputFormatter {
  const ThousandsFormatter();

  static String format(int value) {
    final s = formatMnt(value);
    return s.substring(0, s.length - 1); // «₮»-гүй
  }

  @override
  TextEditingValue formatEditUpdate(TextEditingValue oldValue, TextEditingValue newValue) {
    final digits = newValue.text.replaceAll(RegExp(r'\D'), '');
    if (digits.isEmpty) return const TextEditingValue();
    final text = format(int.parse(digits.length > 15 ? digits.substring(0, 15) : digits));
    return TextEditingValue(
      text: text,
      selection: TextSelection.collapsed(offset: text.length),
    );
  }
}

/// Төгрөгийн дүн «₮». Утга: `int`.
class FormMoneyField extends StatelessWidget {
  const FormMoneyField({
    super.key,
    required this.name,
    required this.label,
    this.initial,
    this.helper,
    this.required = false,
    this.min,
    this.max,
    this.enabled = true,
    this.onChanged,
  });

  final String name;
  final String label;
  final int? initial;
  final String? helper;
  final bool required;
  final int? min;
  final int? max;
  final bool enabled;
  final ValueChanged<int?>? onChanged;

  static int? parse(String text) {
    final digits = text.replaceAll(RegExp(r'\D'), '');
    return digits.isEmpty ? null : int.tryParse(digits);
  }

  @override
  Widget build(BuildContext context) {
    return _TextSheetField<int>(
      name: name,
      label: label,
      initial: initial,
      helper: helper,
      suffixText: '₮',
      enabled: enabled,
      onChanged: onChanged,
      keyboardType: TextInputType.number,
      inputFormatters: const [ThousandsFormatter()],
      parse: parse,
      format: ThousandsFormatter.format,
      validate: (text, value) {
        if (text.trim().isEmpty) return required ? FormMessages.required : null;
        if (value == null) return FormMessages.money;
        if (min != null && value < min!) return 'Хамгийн багадаа ${formatMnt(min!)}';
        if (max != null && value > max!) return 'Хамгийн ихдээ ${formatMnt(max!)}';
        return null;
      },
    );
  }
}

/// Дарахад сонголт нээгддэг талбарын харагдах байдал.
class _PickerBox extends StatelessWidget {
  const _PickerBox({
    required this.label,
    required this.text,
    required this.onTap,
    required this.enabled,
    this.errorText,
    this.icon,
  });

  final String label;
  final String? text;
  final VoidCallback onTap;
  final bool enabled;
  final String? errorText;
  final IconData? icon;

  static const placeholder = 'Сонгох';

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final empty = text == null || text!.isEmpty;
    return Semantics(
      button: true,
      label: label,
      value: empty ? placeholder : text,
      excludeSemantics: true,
      child: InkWell(
        onTap: enabled ? onTap : null,
        borderRadius: BorderRadius.circular(AppRadius.md),
        child: InputDecorator(
          isEmpty: false,
          decoration: InputDecoration(
            labelText: label,
            errorText: errorText,
            enabled: enabled,
            prefixIcon: icon == null ? null : Icon(icon, size: 20),
            suffixIcon: Icon(AppIcons.expand, size: 18, color: c.inkDim),
          ),
          child: Text(
            empty ? placeholder : text!,
            style: context.text.bodyLarge?.copyWith(color: empty ? c.inkDim : c.ink),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ),
    );
  }
}

/// UB-ийн хуанлийн өдрийг утасны `DateTime` болгох (сонгогчид зориулж).
DateTime _localOf(UbDateTime d) => DateTime(d.year, d.month, d.day);

/// Огноо (Улаанбаатарын цагаар). Утга: [UbDateTime] (00:00).
class FormDateField extends StatelessWidget {
  const FormDateField({
    super.key,
    required this.name,
    required this.label,
    this.initial,
    this.first,
    this.last,
    this.required = false,
    this.enabled = true,
    this.onChanged,
  });

  final String name;
  final String label;
  final UbDateTime? initial;

  /// Сонгох боломжтой хамгийн эрт өдөр (өгөгдмөл: 2 жилийн өмнө).
  final UbDateTime? first;

  /// Хамгийн хожуу өдөр (өгөгдмөл: 2 жилийн дараа).
  final UbDateTime? last;
  final bool required;
  final bool enabled;
  final ValueChanged<UbDateTime?>? onChanged;

  /// «2026.11.04, Лхагва»
  static String display(UbDateTime d) => '${DateMn.numeric(d)}, ${weekdayNameMn(d.weekday)}';

  @override
  Widget build(BuildContext context) {
    return _SheetField<UbDateTime>(
      name: name,
      initial: initial?.startOfDay,
      enabled: enabled,
      onChanged: onChanged,
      validator: (v) => required && v == null ? FormMessages.date : null,
      builder: (context, field, set, enabled) => _PickerBox(
        label: label,
        icon: AppIcons.calendar,
        text: field.value == null ? null : display(field.value!),
        errorText: field.errorText,
        enabled: enabled,
        onTap: () async {
          final today = UbDateTime.now().startOfDay;
          final lo = first ?? today.addDays(-730);
          final hi = last ?? today.addDays(730);
          var init = field.value ?? today;
          if (init.compareTo(lo) < 0) init = lo;
          if (init.compareTo(hi) > 0) init = hi;
          final picked = await showDatePicker(
            context: context,
            initialDate: _localOf(init),
            firstDate: _localOf(lo),
            lastDate: _localOf(hi),
            currentDate: _localOf(today),
            helpText: label,
            cancelText: AppStrings.cancel,
            confirmText: 'Сонгох',
          );
          if (picked != null) set(UbDateTime(picked.year, picked.month, picked.day));
        },
      ),
    );
  }
}

/// Цаг (24 цагийн). Утга: [TimeOfDay].
class FormTimeField extends StatelessWidget {
  const FormTimeField({
    super.key,
    required this.name,
    required this.label,
    this.initial,
    this.required = false,
    this.enabled = true,
    this.onChanged,
  });

  final String name;
  final String label;
  final TimeOfDay? initial;
  final bool required;
  final bool enabled;
  final ValueChanged<TimeOfDay?>? onChanged;

  static String display(TimeOfDay t) => '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    return _SheetField<TimeOfDay>(
      name: name,
      initial: initial,
      enabled: enabled,
      onChanged: onChanged,
      validator: (v) => required && v == null ? FormMessages.time : null,
      builder: (context, field, set, enabled) => _PickerBox(
        label: label,
        icon: AppIcons.time,
        text: field.value == null ? null : display(field.value!),
        errorText: field.errorText,
        enabled: enabled,
        onTap: () async {
          final picked = await showTimePicker(
            context: context,
            initialTime: field.value ?? const TimeOfDay(hour: 9, minute: 0),
            helpText: label,
            cancelText: AppStrings.cancel,
            confirmText: 'Сонгох',
            builder: (ctx, child) =>
                MediaQuery(data: MediaQuery.of(ctx).copyWith(alwaysUse24HourFormat: true), child: child!),
          );
          if (picked != null) set(picked);
        },
      ),
    );
  }
}

/// Нэг сонголт — дарахад доороос жагсаалт ([showSelectSheet]). Утга: `T`.
class FormSelectField<T> extends StatelessWidget {
  const FormSelectField({
    super.key,
    required this.name,
    required this.label,
    required this.options,
    this.initial,
    this.required = false,
    this.enabled = true,
    this.onChanged,
    this.icon,
  });

  final String name;
  final String label;
  final List<SelectOption<T>> options;
  final T? initial;
  final bool required;
  final bool enabled;
  final ValueChanged<T?>? onChanged;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return _SheetField<T>(
      name: name,
      initial: initial,
      enabled: enabled,
      onChanged: onChanged,
      validator: (v) => required && v == null ? FormMessages.choose : null,
      builder: (context, field, set, enabled) {
        String? text;
        for (final o in options) {
          if (o.value == field.value) text = o.label;
        }
        return _PickerBox(
          label: label,
          icon: icon,
          text: text,
          errorText: field.errorText,
          enabled: enabled,
          onTap: () async {
            final picked = await showSelectSheet<T>(context, title: label, options: options, selected: field.value);
            if (picked != null) set(picked.value);
          },
        );
      },
    );
  }
}

/// Олон сонголт — чипүүд. Утга: `Set<T>`.
class FormMultiSelectField<T> extends StatelessWidget {
  const FormMultiSelectField({
    super.key,
    required this.name,
    required this.label,
    required this.options,
    this.initial = const {},
    this.required = false,
    this.enabled = true,
    this.onChanged,
  });

  final String name;
  final String label;
  final List<SelectOption<T>> options;
  final Set<T> initial;
  final bool required;
  final bool enabled;
  final ValueChanged<Set<T>?>? onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return _SheetField<Set<T>>(
      name: name,
      initial: {...initial},
      enabled: enabled,
      onChanged: onChanged,
      validator: (v) => required && (v == null || v.isEmpty) ? FormMessages.chooseAtLeastOne : null,
      builder: (context, field, set, enabled) {
        final value = field.value ?? <T>{};
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: context.text.labelLarge),
            const SizedBox(height: AppSpace.sm),
            Wrap(
              spacing: AppSpace.sm,
              runSpacing: 0,
              children: [
                for (final o in options)
                  FilterChip(
                    label: Text(o.label),
                    selected: value.contains(o.value),
                    showCheckmark: true,
                    checkmarkColor: c.brand,
                    selectedColor: c.brandTint,
                    backgroundColor: c.surface,
                    side: BorderSide(color: value.contains(o.value) ? c.brandTint : c.line),
                    labelStyle: context.text.labelLarge?.copyWith(color: value.contains(o.value) ? c.brand : c.ink),
                    onSelected: enabled
                        ? (on) {
                            unawaited(HapticFeedback.selectionClick());
                            // Одоогийн утгаас (хурдан дараалсан товшилтод хуучин утга дарахгүй).
                            final cur = field.value ?? <T>{};
                            set(on ? {...cur, o.value} : ({...cur}..remove(o.value)));
                          }
                        : null,
                  ),
              ],
            ),
            if (field.errorText != null)
              Padding(
                padding: const EdgeInsets.only(top: AppSpace.xs),
                child: Text(field.errorText!, style: context.text.bodySmall?.copyWith(color: c.error)),
              ),
          ],
        );
      },
    );
  }
}

/// Асаах/унтраах. Утга: `bool`.
class FormSwitchField extends StatelessWidget {
  const FormSwitchField({
    super.key,
    required this.name,
    required this.label,
    this.subtitle,
    this.initial = false,
    this.enabled = true,
    this.onChanged,
  });

  final String name;
  final String label;
  final String? subtitle;
  final bool initial;
  final bool enabled;
  final ValueChanged<bool?>? onChanged;

  @override
  Widget build(BuildContext context) {
    return _SheetField<bool>(
      name: name,
      initial: initial,
      enabled: enabled,
      onChanged: onChanged,
      validator: null,
      builder: (context, field, set, enabled) => SwitchListTile(
        contentPadding: EdgeInsets.zero,
        title: Text(label, style: context.text.bodyLarge),
        subtitle: subtitle == null ? null : Text(subtitle!, style: context.text.bodySmall),
        value: field.value ?? false,
        onChanged: enabled
            ? (v) {
                unawaited(HapticFeedback.selectionClick());
                set(v);
              }
            : null,
      ),
    );
  }
}
