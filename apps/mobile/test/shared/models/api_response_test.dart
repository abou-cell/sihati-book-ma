import 'package:flutter_test/flutter_test.dart';
import 'package:sihati_mobile/core/errors/app_exception.dart';
import 'package:sihati_mobile/shared/models/api_response.dart';

void main() {
  group('ApiResponse', () {
    test('parses response envelopes', () {
      final response = ApiResponse.fromJson(
        {
          'data': {'id': '123'},
          'meta': {'page': 1},
        },
        ApiResponse.parseObject,
      );

      expect(response.data['id'], '123');
      expect(response.meta?['page'], 1);
    });

    test('throws parsing exception for invalid envelopes', () {
      expect(
        () => ApiResponse.fromJson(null, (json) => json),
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
