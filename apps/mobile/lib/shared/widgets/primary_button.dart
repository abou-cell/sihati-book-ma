import 'package:flutter/material.dart';

enum PrimaryButtonVariant { filled, outlined, text }

class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    required this.label,
    required this.onPressed,
    this.variant = PrimaryButtonVariant.filled,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final PrimaryButtonVariant variant;

  @override
  Widget build(BuildContext context) {
    switch (variant) {
      case PrimaryButtonVariant.outlined:
        return OutlinedButton(onPressed: onPressed, child: Text(label));
      case PrimaryButtonVariant.text:
        return TextButton(onPressed: onPressed, child: Text(label));
      case PrimaryButtonVariant.filled:
        return ElevatedButton(onPressed: onPressed, child: Text(label));
    }
  }
}
