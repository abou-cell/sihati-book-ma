import 'package:flutter_test/flutter_test.dart';
import 'package:sihati_mobile/core/config/app_config.dart';

void main() {
  group('AppConfig', () {
    test('allows localhost API URLs in development', () {
      const config = AppConfig(
        environment: AppEnvironment.development,
        apiBaseUrl: 'http://localhost:3000',
      );

      expect(config.apiOriginForDiagnostics, 'http://localhost:3000');
      expect(config.enableDebugBanner, isTrue);
    });

    test('provides environment-specific default API URLs', () {
      expect(
        AppConfig.defaultApiBaseUrl(AppEnvironment.development),
        'http://localhost:3000',
      );
      expect(
        AppConfig.defaultApiBaseUrl(AppEnvironment.staging),
        'https://staging-api.sihati.ma',
      );
      expect(
        AppConfig.defaultApiBaseUrl(AppEnvironment.production),
        'https://api.sihati.ma',
      );
    });

    test('resolves API paths and query parameters', () {
      const config = AppConfig(
        environment: AppEnvironment.development,
        apiBaseUrl: 'http://localhost:3000',
      );

      expect(
        config
            .resolveApiUri('/api/practitioners', {'city': 'Rabat'})
            .toString(),
        'http://localhost:3000/api/practitioners?city=Rabat',
      );
    });

    test('requires HTTPS API URLs outside development', () {
      const config = AppConfig(
        environment: AppEnvironment.staging,
        apiBaseUrl: 'http://staging.sihati.example',
      );

      expect(config.validate, throwsArgumentError);
    });

    test('rejects localhost API URLs in production', () {
      const config = AppConfig(
        environment: AppEnvironment.production,
        apiBaseUrl: 'https://localhost:3000',
      );

      expect(config.validate, throwsArgumentError);
    });
  });
}
