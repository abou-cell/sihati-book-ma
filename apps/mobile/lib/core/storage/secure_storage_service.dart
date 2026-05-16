import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const String authTokenKey = 'sihati.auth_token';
  static const String refreshTokenKey = 'sihati.refresh_token';

  final FlutterSecureStorage _storage;

  Future<String?> readAuthToken() => read(authTokenKey);

  Future<void> writeAuthToken(String token) {
    return write(key: authTokenKey, value: token);
  }

  Future<void> deleteAuthToken() => delete(authTokenKey);

  Future<String?> readRefreshToken() => read(refreshTokenKey);

  Future<void> writeRefreshToken(String token) {
    return write(key: refreshTokenKey, value: token);
  }

  Future<void> deleteRefreshToken() => delete(refreshTokenKey);

  Future<String?> read(String key) => _storage.read(key: key);

  Future<void> write({required String key, required String value}) {
    return _storage.write(key: key, value: value);
  }

  Future<void> delete(String key) => _storage.delete(key: key);

  Future<void> clearSession() async {
    await Future.wait([
      deleteAuthToken(),
      deleteRefreshToken(),
    ]);
  }
}
