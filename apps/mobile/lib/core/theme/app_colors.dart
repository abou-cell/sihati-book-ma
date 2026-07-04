import 'package:flutter/material.dart';

/// Sihati color tokens for a calm, medical, Morocco-aware identity.
class AppColors {
  const AppColors._();

  static const primary = Color(0xFF0F766E);
  static const primaryDark = Color(0xFF115E59);
  static const primaryLight = Color(0xFFCCFBF1);
  static const secondary = Color(0xFF0284C7);
  static const accent = Color(0xFFD97706);

  static const background = Color(0xFFF8FAFC);
  static const surface = Color(0xFFFFFFFF);
  static const surfaceMuted = Color(0xFFF1F5F9);
  static const border = Color(0xFFCBD5E1);

  static const textPrimary = Color(0xFF0F172A);
  static const textSecondary = Color(0xFF475569);
  static const textMuted = Color(0xFF64748B);
  static const onPrimary = Color(0xFFFFFFFF);

  static const success = Color(0xFF15803D);
  static const successBg = Color(0xFFDCFCE7);
  static const warning = Color(0xFFB45309);
  static const warningBg = Color(0xFFFEF3C7);
  static const danger = Color(0xFFB91C1C);
  static const dangerBg = Color(0xFFFEE2E2);
  static const info = Color(0xFF0369A1);
  static const infoBg = Color(0xFFE0F2FE);

  static ColorScheme get lightScheme => const ColorScheme(
        brightness: Brightness.light,
        primary: primary,
        onPrimary: onPrimary,
        primaryContainer: primaryLight,
        onPrimaryContainer: primaryDark,
        secondary: secondary,
        onSecondary: onPrimary,
        secondaryContainer: infoBg,
        onSecondaryContainer: info,
        tertiary: accent,
        onTertiary: onPrimary,
        tertiaryContainer: warningBg,
        onTertiaryContainer: warning,
        error: danger,
        onError: onPrimary,
        errorContainer: dangerBg,
        onErrorContainer: danger,
        surface: surface,
        onSurface: textPrimary,
        surfaceContainerHighest: surfaceMuted,
        onSurfaceVariant: textSecondary,
        outline: border,
        outlineVariant: Color(0xFFE2E8F0),
        shadow: Color(0x1A0F172A),
        scrim: Color(0x990F172A),
        inverseSurface: Color(0xFF1E293B),
        onInverseSurface: Color(0xFFF8FAFC),
        inversePrimary: Color(0xFF5EEAD4),
      );
}
