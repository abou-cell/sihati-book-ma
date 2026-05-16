class AppError implements Exception {
  const AppError({required this.code, required this.message, this.details});

  final String code;
  final String message;
  final Map<String, Object?>? details;

  @override
  String toString() => 'AppError(code: $code, message: $message)';
}
