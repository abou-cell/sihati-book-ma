enum AppEnvironment { development, staging, production }

class AppConfig {
  const AppConfig({
    required this.environment,
    required this.apiBaseUrl,
    this.appName = 'Sihati',
    this.apiTimeout = defaultApiTimeout,
  });

  static const Duration defaultApiTimeout = Duration(seconds: 20);
  static const Duration minimumApiTimeout = Duration(seconds: 5);
  static const Duration maximumApiTimeout = Duration(seconds: 60);

  factory AppConfig.fromEnvironment() {
    final environment = _environmentFromName(
      const String.fromEnvironment('APP_ENV', defaultValue: 'development'),
    );

    final configuredBaseUrl = const String.fromEnvironment('API_BASE_URL');
    final config = AppConfig(
      appName: const String.fromEnvironment(
        'APP_NAME',
        defaultValue: 'Sihati',
      ),
      environment: environment,
      apiBaseUrl: configuredBaseUrl.isEmpty
          ? defaultApiBaseUrl(environment)
          : configuredBaseUrl,
      apiTimeout: Duration(
        seconds: _boundedInt(
          const int.fromEnvironment('API_TIMEOUT_SECONDS', defaultValue: 20),
          defaultValue: defaultApiTimeout.inSeconds,
          minimum: minimumApiTimeout.inSeconds,
          maximum: maximumApiTimeout.inSeconds,
        ),
      ),
    );

    config.validate();
    return config;
  }

  final String appName;
  final AppEnvironment environment;
  final String apiBaseUrl;
  final Duration apiTimeout;

  bool get enableDebugBanner => environment != AppEnvironment.production;

  bool get isProduction => environment == AppEnvironment.production;

  bool get isStaging => environment == AppEnvironment.staging;

  bool get isDevelopment => environment == AppEnvironment.development;

  String get environmentName {
    return switch (environment) {
      AppEnvironment.development => 'development',
      AppEnvironment.staging => 'staging',
      AppEnvironment.production => 'production',
    };
  }

  Uri get apiUri {
    final uri = Uri.tryParse(apiBaseUrl.trim());
    if (uri == null || !uri.hasScheme || uri.host.isEmpty) {
      throw ArgumentError.value(
        apiBaseUrl,
        'apiBaseUrl',
        'API_BASE_URL must be an absolute URL with a scheme and host.',
      );
    }

    return uri;
  }

  String get normalizedApiBaseUrl {
    final uri = apiUri;
    final path = uri.path == '/'
        ? ''
        : uri.path.replaceFirst(RegExp(r'/+$'), '');
    return uri.replace(path: path, query: null, fragment: null).toString();
  }

  String get apiOriginForDiagnostics => apiUri.origin;

  Uri resolveApiUri(String path, [Map<String, dynamic>? queryParameters]) {
    final normalizedPath = path.startsWith('/') ? path.substring(1) : path;
    final basePath =
        apiUri.path.endsWith('/') ? apiUri.path : '${apiUri.path}/';
    final resolved = apiUri.replace(
      path: '$basePath$normalizedPath',
      query: null,
      fragment: null,
    );

    final normalizedQuery = _normalizeQueryParameters(queryParameters);
    if (normalizedQuery.isEmpty) {
      return resolved;
    }

    return resolved.replace(queryParameters: normalizedQuery);
  }

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

    if (apiTimeout < minimumApiTimeout || apiTimeout > maximumApiTimeout) {
      throw ArgumentError.value(
        apiTimeout,
        'apiTimeout',
        'API timeout must be between '
        '${minimumApiTimeout.inSeconds} and '
        '${maximumApiTimeout.inSeconds} seconds.',
      );
    }
  }

  static String defaultApiBaseUrl(AppEnvironment environment) {
    switch (environment) {
      case AppEnvironment.production:
        return 'https://api.sihati.ma';
      case AppEnvironment.staging:
        return 'https://staging-api.sihati.ma';
      case AppEnvironment.development:
        return 'http://localhost:3000';
    }
  }

  static AppEnvironment _environmentFromName(String name) {
    switch (name.trim().toLowerCase()) {
      case 'production':
      case 'prod':
        return AppEnvironment.production;
      case 'staging':
      case 'stage':
        return AppEnvironment.staging;
      case 'development':
      case 'dev':
      case 'local':
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

  static int _boundedInt(
    int value, {
    required int defaultValue,
    required int minimum,
    required int maximum,
  }) {
    if (value <= 0) {
      return defaultValue;
    }

    if (value < minimum) {
      return minimum;
    }

    if (value > maximum) {
      return maximum;
    }

    return value;
  }

  static Map<String, dynamic> _normalizeQueryParameters(
    Map<String, dynamic>? queryParameters,
  ) {
    if (queryParameters == null || queryParameters.isEmpty) {
      return const {};
    }

    return Map.fromEntries(
      queryParameters.entries
          .where((entry) => entry.value != null)
          .map((entry) {
        final value = entry.value;
        if (value is Iterable) {
          return MapEntry(
            entry.key,
            value.where((item) => item != null).map((item) => item.toString()),
          );
        }

        return MapEntry(entry.key, value.toString());
      }),
    );
  }
}
