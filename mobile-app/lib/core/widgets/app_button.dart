import 'package:flutter/material.dart';

class AppButton extends StatelessWidget {
  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.loading = false,
    this.outlined = false,
    this.icon,
    this.color,
    this.expand = true,
  });

  final String label;
  final VoidCallback? onPressed;
  final bool loading;
  final bool outlined;
  final IconData? icon;
  final Color? color;
  final bool expand;

  @override
  Widget build(BuildContext context) {
    final effectiveOnPressed = loading ? null : onPressed;
    final minSize =
        expand ? const Size(double.infinity, 48) : const Size(0, 48);

    Widget child = loading
        ? const SizedBox(
            width: 20,
            height: 20,
            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
          )
        : icon != null
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [Icon(icon, size: 18), const SizedBox(width: 8), Text(label)],
              )
            : Text(label);

    if (outlined) {
      return OutlinedButton(
        onPressed: effectiveOnPressed,
        style: OutlinedButton.styleFrom(
          minimumSize: minSize,
          foregroundColor: color,
        ),
        child: child,
      );
    }

    return ElevatedButton(
      onPressed: effectiveOnPressed,
      style: ElevatedButton.styleFrom(
        minimumSize: minSize,
        backgroundColor: color,
      ),
      child: child,
    );
  }
}
