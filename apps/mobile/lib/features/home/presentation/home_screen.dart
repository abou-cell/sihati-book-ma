import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../shared/widgets/app_card.dart';
import '../../../shared/widgets/primary_button.dart';
import '../../../shared/widgets/secondary_button.dart';
import '../../../shared/widgets/status_badge.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: AppSpacing.screenPaddingFor(constraints.maxWidth),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - AppSpacing.xxl,
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(
                      maxWidth: AppSpacing.maxContentWidth,
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const _BrandHeader(),
                        const SizedBox(height: AppSpacing.xl),
                        Text(
                          'Book an appointment with a healthcare professional in Morocco',
                          style: textTheme.headlineMedium,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppSpacing.md),
                        Text(
                          'Find trusted practitioners for in-person visits or video consultations, with a reassuring mobile experience built for patients and care teams.',
                          style: textTheme.titleMedium,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: AppSpacing.lg),
                        const _TrustCard(),
                        const SizedBox(height: AppSpacing.xl),
                        PrimaryButton(
                          label: 'Find a practitioner',
                          icon: Icons.search,
                          onPressed: () => _showComingSoon(context),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        SecondaryButton(
                          label: 'Login',
                          icon: Icons.lock_outline,
                          onPressed: () => _showComingSoon(context),
                        ),
                        const SizedBox(height: AppSpacing.sm),
                        SecondaryButton(
                          label: 'Join as practitioner',
                          icon: Icons.medical_services_outlined,
                          isText: true,
                          onPressed: () => _showComingSoon(context),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }

  void _showComingSoon(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('This mobile flow will be connected in a later phase.'),
      ),
    );
  }
}

class _BrandHeader extends StatelessWidget {
  const _BrandHeader();

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 80,
          height: 80,
          decoration: const BoxDecoration(
            color: AppColors.primaryLight,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.health_and_safety_outlined,
            color: AppColors.primaryDark,
            size: 42,
          ),
        ),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Sihati',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppColors.primaryDark,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.2,
              ),
        ),
      ],
    );
  }
}

class _TrustCard extends StatelessWidget {
  const _TrustCard();

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Wrap(
        alignment: WrapAlignment.center,
        runSpacing: AppSpacing.sm,
        spacing: AppSpacing.sm,
        children: const [
          StatusBadge(label: 'Secure by design', tone: StatusBadgeTone.success),
          StatusBadge(label: 'Morocco-first care', tone: StatusBadgeTone.info),
          StatusBadge(
            label: 'Mobile appointments',
            tone: StatusBadgeTone.neutral,
          ),
        ],
      ),
    );
  }
}
