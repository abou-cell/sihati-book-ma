enum AppEnvironment { development, staging, production }

class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    this.appName = 'Sihati',
  });

  factory AppConfig.fromEnvironment() {
    final config = AppConfig(
      appName: const String.fromEnvironment(
        'APP_NAME',
        defaultValue: 'Sihati',
      ),
      environment: _environmentFromName(
        const String.fromEnvironment(
          'APP_ENV',
          defaultValue: 'development',
        ),
      ),
      apiBaseUrl: const String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: 'http://localhost:3000',
      ),
    );

    config.validate();
    return config;
  }

  final String appName;
  final AppEnvironment environment;
  final String apiBaseUrl;

  bool get enableDebugBanner => environment != AppEnvironment.production;

  void validate() {
    if (environment != AppEnvironment.development &&
        !apiBaseUrl.startsWith('https://')) {
      throw ArgumentError.value(
        apiBaseUrl,
        'apiBaseUrl',
        'Staging and production API URLs must use HTTPS.',
      );
    }
  }

  static AppEnvironment _environmentFromName(String name) {
    switch (name) {
      case 'production':
        return AppEnvironment.production;
      case 'staging':
        return AppEnvironment.staging;
      case 'development':
      default:
        return AppEnvironment.development;
    }
  }
}
