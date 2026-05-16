enum AppExceptionType {
  unauthorized,
  forbidden,
  notFound,
  validation,
  server,
  network,
  timeout,
  parsing,
  unknown,
}

class AppException implements Exception {
  const AppException({
    required this.type,
    required this.message,
    this.code,
    this.statusCode,
    this.details,
  });

  final AppExceptionType type;
  final String message;
  final String? code;
  final int? statusCode;
  final Object? details;

  bool get canRetry =>
      type == AppExceptionType.network ||
      type == AppExceptionType.timeout ||
      type == AppExceptionType.server;

  factory AppException.fromStatusCode(
    int statusCode, {
    String? message,
    String? code,
    Object? details,
  }) {
    final type = switch (statusCode) {
      401 => AppExceptionType.unauthorized,
      403 => AppExceptionType.forbidden,
      404 => AppExceptionType.notFound,
      422 || 400 => AppExceptionType.validation,
      >= 500 => AppExceptionType.server,
      _ => AppExceptionType.unknown,
    };

    return AppException(
      type: type,
      statusCode: statusCode,
      code: code ?? _defaultCodeFor(type),
      message: message ?? _defaultMessageFor(type),
      details: details,
    );
  }

  factory AppException.network({Object? details}) {
    return AppException(
      type: AppExceptionType.network,
      code: _defaultCodeFor(AppExceptionType.network),
      message: _defaultMessageFor(AppExceptionType.network),
      details: details,
    );
  }

  factory AppException.timeout({Object? details}) {
    return AppException(
      type: AppExceptionType.timeout,
      code: _defaultCodeFor(AppExceptionType.timeout),
      message: _defaultMessageFor(AppExceptionType.timeout),
      details: details,
    );
  }

  factory AppException.parsing({Object? details}) {
    return AppException(
      type: AppExceptionType.parsing,
      code: _defaultCodeFor(AppExceptionType.parsing),
      message: _defaultMessageFor(AppExceptionType.parsing),
      details: details,
    );
  }

  static String _defaultCodeFor(AppExceptionType type) {
    return switch (type) {
      AppExceptionType.unauthorized => 'UNAUTHORIZED',
      AppExceptionType.forbidden => 'FORBIDDEN',
      AppExceptionType.notFound => 'NOT_FOUND',
      AppExceptionType.validation => 'VALIDATION_ERROR',
      AppExceptionType.server => 'SERVER_ERROR',
      AppExceptionType.network => 'NETWORK_ERROR',
      AppExceptionType.timeout => 'REQUEST_TIMEOUT',
      AppExceptionType.parsing => 'PARSING_ERROR',
      AppExceptionType.unknown => 'UNKNOWN_ERROR',
    };
  }

  static String _defaultMessageFor(AppExceptionType type) {
    return switch (type) {
      AppExceptionType.unauthorized => 'Please sign in to continue.',
      AppExceptionType.forbidden => 'You do not have permission to do that.',
      AppExceptionType.notFound => 'The requested resource was not found.',
      AppExceptionType.validation => 'Please check the submitted information.',
      AppExceptionType.server => 'The server could not complete the request.',
      AppExceptionType.network =>
        'Unable to reach Sihati. Check your connection and try again.',
      AppExceptionType.timeout => 'The request timed out. Please try again.',
      AppExceptionType.parsing => 'The server response could not be read.',
      AppExceptionType.unknown => 'Something went wrong. Please try again.',
    };
  }

  @override
  String toString() {
    return 'AppException(type: $type, code: $code, statusCode: $statusCode, message: $message)';
  }
}
