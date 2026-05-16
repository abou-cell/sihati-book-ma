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
