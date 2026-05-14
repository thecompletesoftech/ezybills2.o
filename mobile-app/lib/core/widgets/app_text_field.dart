import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class AppTextField extends StatelessWidget {
  const AppTextField({
    super.key,
    required this.label,
    this.controller,
    this.hint,
    this.obscure = false,
    this.keyboardType,
    this.inputFormatters,
    this.validator,
    this.onChanged,
    this.onSubmitted,
    this.suffix,
    this.prefix,
    this.maxLines = 1,
    this.enabled = true,
    this.autofocus = false,
    this.focusNode,
  });

  final String label;
  final TextEditingController? controller;
  final String? hint;
  final bool obscure;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final String? Function(String?)? validator;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final Widget? suffix;
  final Widget? prefix;
  final int maxLines;
  final bool enabled;
  final bool autofocus;
  final FocusNode? focusNode;

  @override
  Widget build(BuildContext context) => TextFormField(
        controller: controller,
        obscureText: obscure,
        keyboardType: keyboardType,
        inputFormatters: inputFormatters,
        validator: validator,
        onChanged: onChanged,
        onFieldSubmitted: onSubmitted,
        maxLines: obscure ? 1 : maxLines,
        enabled: enabled,
        autofocus: autofocus,
        focusNode: focusNode,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          suffixIcon: suffix,
          prefixIcon: prefix,
          border: const OutlineInputBorder(),
          isDense: true,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        ),
      );
}
