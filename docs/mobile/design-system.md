# Sihati Mobile Design System

The Sihati mobile design system is a reusable Flutter foundation for a clean, medical, Moroccan, and reassuring patient experience. It is Material 3 based, mobile-first, light-mode ready, and structured so future screens avoid hardcoded repeated styles.

## Colors

Color tokens live in `apps/mobile/lib/core/theme/app_colors.dart`.

| Token | Hex | Usage |
| --- | --- | --- |
| `primary` | `#0F766E` | Main healthcare teal for primary actions and focus states. |
| `primaryDark` | `#115E59` | High-contrast teal for headings and outlined/text actions. |
| `primaryLight` | `#CCFBF1` | Soft teal backgrounds for reassuring brand moments. |
| `secondary` | `#0284C7` | Informational blue accents. |
| `accent` | `#D97706` | Warm Moroccan accent used sparingly. |
| `background` | `#F8FAFC` | App scaffold background. |
| `surface` | `#FFFFFF` | Cards, fields, and contained surfaces. |
| `surfaceMuted` | `#F1F5F9` | Neutral badges and subtle grouping. |
| `success`, `warning`, `danger`, `info` | Semantic tokens | Status badges, error states, and healthcare workflow feedback. |

## Typography

Typography lives in `apps/mobile/lib/core/theme/app_typography.dart` and is applied through `AppTheme.light()`.

- Use `headlineMedium` for major screen titles.
- Use `headlineSmall` for brand and section headers.
- Use `titleLarge` for card titles and state titles.
- Use `titleMedium` for important supporting copy.
- Use `bodyLarge` and `bodyMedium` for readable patient-facing content.
- Use `labelLarge` and `labelMedium` for controls and compact badges.

## Spacing

Spacing and layout tokens live in `apps/mobile/lib/core/theme/app_spacing.dart`.

- Base scale: `xxs` 4, `xs` 8, `sm` 12, `md` 16, `lg` 24, `xl` 32, `xxl` 48.
- Radius scale: `radiusSm` 12, `radiusMd` 16, `radiusLg` 24, `radiusPill` 999.
- Touch targets: `minTouchTarget` 48 and `buttonHeight` 52.
- Screen padding: use `AppSpacing.screenPaddingFor(width)` to keep small phones comfortable and larger devices readable.
- Content width: use `AppSpacing.maxContentWidth` for centered phone/tablet content.

## Reusable widgets

Reusable widgets live in `apps/mobile/lib/shared/widgets/`.

- `PrimaryButton`: filled primary CTA with optional icon, loading state, and full-width behavior.
- `SecondaryButton`: outlined or text secondary action with optional icon.
- `AppTextField`: themed `TextFormField` wrapper for labels, hints, icons, validation, and secure entry.
- `AppCard`: consistent card container with padding, radius, border, and optional tap handling.
- `LoadingView`: accessible centered loading state with live-region semantics.
- `EmptyState`: reusable empty-content message with optional action.
- `ErrorState`: reusable error message with optional retry action.
- `StatusBadge`: semantic compact badge for success, warning, danger, info, and neutral statuses.

## Accessibility notes

- Primary colors are chosen for readable contrast on light surfaces.
- Buttons use at least 52 px height, exceeding the 48 px minimum touch target.
- Text styles use comfortable line heights for patient readability.
- Loading and status components include semantic labels where appropriate.
- Avoid relying on color alone; pair status colors with text labels.
- Keep form labels visible and use helper/error text for medical or account-related guidance.

## Future dark mode notes

The system is ready for dark mode by design:

- Colors are isolated in `AppColors`; add a `darkScheme` without rewriting screens.
- Typography is centralized in `AppTypography`; dark text colors can be provided as a separate `TextTheme`.
- Widgets consume `Theme.of(context)` and design tokens instead of hardcoded screen styles.
- Keep semantic colors (`success`, `warning`, `danger`, `info`) tokenized so dark variants can preserve contrast.

## Production readiness, testing, and deployment practices

- Keep UI primitives in `shared/widgets` and app-wide design tokens in `core/theme`.
- Add widget tests for every reusable component before connecting real appointment, auth, or payment flows.
- Use golden tests for important medical journey screens after layouts stabilize.
- Run `flutter analyze`, `flutter test`, and `dart format --set-exit-if-changed .` in mobile CI.
- Keep secrets out of Flutter code and rely on secure runtime configuration plus platform secure storage.
- Use separate build flavors for development, staging, and production deployments.
- Maintain release checklists covering accessibility, localization readiness, privacy copy, crash reporting, and store metadata.

## Usage example

```dart
return AppCard(
  child: Column(
    children: [
      Text('Find care', style: Theme.of(context).textTheme.headlineMedium),
      const SizedBox(height: AppSpacing.md),
      const StatusBadge(label: 'Available today', tone: StatusBadgeTone.success),
      const SizedBox(height: AppSpacing.lg),
      PrimaryButton(label: 'Book appointment', onPressed: onBook),
    ],
  ),
);
```

Import design tokens and widgets instead of creating one-off colors, padding, radii, or button styles inside screens.
