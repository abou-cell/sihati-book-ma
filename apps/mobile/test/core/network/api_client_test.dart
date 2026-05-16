import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sihati_mobile/core/config/app_config.dart';
import 'package:sihati_mobile/core/errors/app_exception.dart';
import 'package:sihati_mobile/core/network/api_client.dart';

void main() {
  const config = AppConfig(
    environment: AppEnvironment.development,
    apiBaseUrl: 'http://localhost:3000',
  );

  group('ApiClient', () {
    test('injects bearer token from token provider', () async {
      final client = ApiClient(
        config: config,
        tokenProvider: () async => 'test-token',
        httpClient: MockClient((request) async {
          expect(request.headers['Authorization'], 'Bearer test-token');
          return http.Response(jsonEncode({'data': true}), 200);
        }),
      );

      final result = await client.get<bool>(
        '/api/health',
        parser: (json) => (json as Map<String, dynamic>)['data'] as bool,
      );

      expect(result, isTrue);
    });

    test('maps unauthorized responses', () async {
      final client = ApiClient(
        config: config,
        httpClient: MockClient((request) async {
          return http.Response(
            jsonEncode({
              'error': {
                'code': 'UNAUTHORIZED',
                'message': 'Login required',
              },
            }),
            401,
          );
        }),
      );

      expect(
        () => client.get<void>('/api/secure', parser: (_) {}),
        throwsA(
          isA<AppException>()
              .having(
                (error) => error.type,
                'type',
                AppExceptionType.unauthorized,
              )
              .having((error) => error.code, 'code', 'UNAUTHORIZED')
              .having((error) => error.message, 'message', 'Login required'),
        ),
      );
    });

    test('maps client transport errors to network exceptions', () async {
      final client = ApiClient(
        config: config,
        httpClient: MockClient((request) {
          throw http.ClientException('offline', request.url);
        }),
      );

      expect(
        () => client.get<void>('/api/health', parser: (_) {}),
        throwsA(
          isA<AppException>().having(
            (error) => error.type,
            'type',
            AppExceptionType.network,
          ),
        ),
      );
    });
  });
}
