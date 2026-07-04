import 'package:flutter/material.dart';

/// Spacing, radius, and touch-target tokens used across mobile UI.
class AppSpacing {
  const AppSpacing._();

  static const double xxs = 4;
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 24;
  static const double xl = 32;
  static const double xxl = 48;

  static const double radiusSm = 12;
  static const double radiusMd = 16;
  static const double radiusLg = 24;
  static const double radiusPill = 999;

  static const double minTouchTarget = 48;
  static const double buttonHeight = 52;
  static const double maxContentWidth = 560;

  static EdgeInsets screenPaddingFor(double width) => EdgeInsets.symmetric(
        horizontal: width >= 600 ? xxl : lg,
        vertical: lg,
      );
}
