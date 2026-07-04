import 'package:flutter/material.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';

enum StatusBadgeTone { success, warning, danger, info, neutral }

class StatusBadge extends StatelessWidget {
  const StatusBadge({
    required this.label,
    this.tone = StatusBadgeTone.neutral,
    super.key,
  });

  final String label;
  final StatusBadgeTone tone;

  @override
  Widget build(BuildContext context) {
    final colors = _colorsForTone(tone);

    return Semantics(
      label: 'Status: $label',
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.sm,
          vertical: AppSpacing.xs,
        ),
        decoration: BoxDecoration(
          color: colors.background,
          borderRadius: BorderRadius.circular(AppSpacing.radiusPill),
        ),
        child: Text(
          label,
          style: Theme.of(
            context,
          ).textTheme.labelMedium?.copyWith(color: colors.foreground),
        ),
      ),
    );
  }

  _BadgeColors _colorsForTone(StatusBadgeTone tone) {
    switch (tone) {
      case StatusBadgeTone.success:
        return const _BadgeColors(AppColors.success, AppColors.successBg);
      case StatusBadgeTone.warning:
        return const _BadgeColors(AppColors.warning, AppColors.warningBg);
      case StatusBadgeTone.danger:
        return const _BadgeColors(AppColors.danger, AppColors.dangerBg);
      case StatusBadgeTone.info:
        return const _BadgeColors(AppColors.info, AppColors.infoBg);
      case StatusBadgeTone.neutral:
        return const _BadgeColors(
          AppColors.textSecondary,
          AppColors.surfaceMuted,
        );
    }
  }
}

class _BadgeColors {
  const _BadgeColors(this.foreground, this.background);
  final Color foreground;
  final Color background;
}
