import '../../core/errors/app_exception.dart';

typedef JsonMap = Map<String, dynamic>;
typedef JsonParser<T> = T Function(JsonMap json);

class ApiResponse<T> {
  const ApiResponse({required this.data, this.meta});

  final T data;
  final JsonMap? meta;

  factory ApiResponse.fromJson(
    Object? json,
    T Function(Object? json) parser,
  ) {
    if (json is! JsonMap) {
      throw AppException.parsing(
        details: 'Expected response envelope object.',
      );
    }

    return ApiResponse<T>(
      data: parser(json['data']),
      meta: json['meta'] is JsonMap ? json['meta'] as JsonMap : null,
    );
  }

  static List<T> parseList<T>(Object? json, T Function(Object? json) parser) {
    if (json is! List) {
      throw AppException.parsing(details: 'Expected a list response.');
    }

    return json.map(parser).toList(growable: false);
  }

  static JsonMap parseObject(Object? json) {
    if (json is! JsonMap) {
      throw AppException.parsing(details: 'Expected a JSON object.');
    }

    return json;
  }
}
