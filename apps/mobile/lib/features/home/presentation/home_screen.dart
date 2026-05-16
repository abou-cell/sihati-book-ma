import 'package:flutter/material.dart';

import '../../../core/theme/app_theme.dart';
import '../../../shared/widgets/primary_button.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            final horizontalPadding = constraints.maxWidth >= 600 ? 48.0 : 24.0;

            return SingleChildScrollView(
              padding: EdgeInsets.symmetric(
                horizontal: horizontalPadding,
                vertical: 24,
              ),
              child: ConstrainedBox(
                constraints: BoxConstraints(
                  minHeight: constraints.maxHeight - 48,
                ),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 560),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const _BrandHeader(),
                        const SizedBox(height: 32),
                        Text(
                          'Book an appointment with a healthcare professional in Morocco',
                          style: textTheme.headlineMedium,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Find trusted practitioners for in-person visits or video consultations, with a reassuring mobile experience built for patients and care teams.',
                          style: textTheme.titleMedium,
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 32),
                        PrimaryButton(
                          label: 'Find a practitioner',
                          onPressed: () => _showComingSoon(context),
                        ),
                        const SizedBox(height: 12),
                        PrimaryButton(
                          label: 'Login',
                          variant: PrimaryButtonVariant.outlined,
                          onPressed: () => _showComingSoon(context),
                        ),
                        const SizedBox(height: 12),
                        PrimaryButton(
                          label: 'Join as practitioner',
                          variant: PrimaryButtonVariant.text,
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
          width: 72,
          height: 72,
          decoration: BoxDecoration(
            color: AppTheme.primary.withOpacity(0.12),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.health_and_safety_outlined,
            color: AppTheme.primary,
            size: 38,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Sihati',
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppTheme.primaryDark,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.2,
              ),
        ),
      ],
    );
  }
}
