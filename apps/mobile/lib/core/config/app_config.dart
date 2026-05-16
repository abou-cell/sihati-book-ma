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

  bool get isProduction => environment == AppEnvironment.production;

  Uri get apiUri {
    final uri = Uri.tryParse(apiBaseUrl);
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw ArgumentError.value(
        apiBaseUrl,
        'apiBaseUrl',
        'API_BASE_URL must be an absolute URL with a scheme and host.',
      );
    }

    return uri;
  }

  String get apiOriginForDiagnostics => apiUri.origin;

  void validate() {
    final uri = apiUri;

    if (uri.scheme != 'http' && uri.scheme != 'https') {
      throw ArgumentError.value(
        apiBaseUrl,
        'apiBaseUrl',
        'API_BASE_URL must use HTTP for local development or HTTPS otherwise.',
      );
    }

    if (environment != AppEnvironment.development && uri.scheme != 'https') {
      throw ArgumentError.value(
        apiBaseUrl,
        'apiBaseUrl',
        'Staging and production API URLs must use HTTPS.',
      );
    }

    if (isProduction && _isLocalHost(uri.host)) {
      throw ArgumentError.value(
        apiBaseUrl,
        'apiBaseUrl',
        'Production API URLs must not point to localhost.',
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

  static bool _isLocalHost(String host) {
    final normalizedHost = host.toLowerCase();
    return normalizedHost == 'localhost' ||
        normalizedHost == '127.0.0.1' ||
        normalizedHost == '::1';
  }
}
