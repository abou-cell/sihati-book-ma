import '../config/app_config.dart';
import '../errors/app_error.dart';

class ApiClient {
  const ApiClient({required this.config});

  final AppConfig config;

  Future<Never> requestPlaceholder(String path) async {
    throw AppError(
      code: 'API_NOT_CONNECTED',
      message:
          'The mobile app skeleton does not connect to the Sihati API yet.',
      details: <String, Object?>{
        'path': path,
        'apiBaseUrl': config.apiBaseUrl,
      },
    );
  }
}
