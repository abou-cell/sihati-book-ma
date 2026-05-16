import 'package:flutter/material.dart';

import '../../features/home/presentation/home_screen.dart';

class AppRoutes {
  const AppRoutes._();

  static const String home = '/';
}

class AppRouter {
  const AppRouter._();

  static Route<void> onGenerateRoute(RouteSettings settings) {
    switch (settings.name) {
      case AppRoutes.home:
        return MaterialPageRoute<void>(
          builder: (_) => const HomeScreen(),
          settings: settings,
        );
      default:
        return MaterialPageRoute<void>(
          builder: (_) => const HomeScreen(),
          settings: const RouteSettings(name: AppRoutes.home),
        );
    }
  }
}
