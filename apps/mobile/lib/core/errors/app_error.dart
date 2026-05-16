import 'app_exception.dart';

@Deprecated('Use AppException for network and domain failures.')
class AppError extends AppException {
  const AppError({
    required String code,
    required String message,
    Map<String, Object?>? details,
  }) : super(
          type: AppExceptionType.unknown,
          code: code,
          message: message,
          details: details,
        );
}
