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
        tokenProvider: () async => ' test-token ',
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

    test('can disable auth injection for public requests', () async {
      final client = ApiClient(
        config: config,
        tokenProvider: () async => 'test-token',
        httpClient: MockClient((request) async {
          expect(request.headers.containsKey('Authorization'), isFalse);
          return http.Response(jsonEncode({'data': true}), 200);
        }),
      );

      final result = await client.get<bool>(
        '/api/health',
        options: const ApiRequestOptions(includeAuthToken: false),
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

  group('ApiClient error mapping', () {
    for (final entry in <int, AppExceptionType>{
      401: AppExceptionType.unauthorized,
      403: AppExceptionType.forbidden,
      404: AppExceptionType.notFound,
      422: AppExceptionType.validation,
      500: AppExceptionType.server,
    }.entries) {
      test('maps ${entry.key} to ${entry.value}', () async {
        final client = ApiClient(
          config: config,
          httpClient: MockClient((request) async {
            return http.Response(
              jsonEncode({
                'error': {'message': 'Mapped failure'},
              }),
              entry.key,
            );
          }),
        );

        expect(
          () => client.get<void>('/api/failure', parser: (_) {}),
          throwsA(
            isA<AppException>().having(
              (error) => error.type,
              'type',
              entry.value,
            ),
          ),
        );
      });
    }

    test('wraps parser failures as parsing exceptions', () async {
      final client = ApiClient(
        config: config,
        httpClient: MockClient((request) async {
          return http.Response(jsonEncode({'data': true}), 200);
        }),
      );

      expect(
        () => client.get<String>(
          '/api/health',
          parser: (json) => (json as Map<String, dynamic>)['missing'] as String,
        ),
        throwsA(
          isA<AppException>().having(
            (error) => error.type,
            'type',
            AppExceptionType.parsing,
          ),
        ),
      );
    });
  });
}
