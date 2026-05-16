import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorageService {
  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? _defaultStorage;

  static const String authTokenKey = 'sihati.auth_token';
  static const String refreshTokenKey = 'sihati.refresh_token';

  static const AndroidOptions _androidOptions = AndroidOptions(
    encryptedSharedPreferences: true,
  );

  static const IOSOptions _iosOptions = IOSOptions(
    accessibility: KeychainAccessibility.first_unlock_this_device,
  );

  static const FlutterSecureStorage _defaultStorage = FlutterSecureStorage(
    aOptions: _androidOptions,
    iOptions: _iosOptions,
  );

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

  Future<String?> read(String key) {
    return _storage.read(
      key: key,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<void> write({required String key, required String value}) {
    return _storage.write(
      key: key,
      value: value,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<void> delete(String key) {
    return _storage.delete(
      key: key,
      aOptions: _androidOptions,
      iOptions: _iosOptions,
    );
  }

  Future<void> clearSession() async {
    await Future.wait([
      deleteAuthToken(),
      deleteRefreshToken(),
    ]);
  }
}
