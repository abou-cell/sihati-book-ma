class SecureStorage {
  const SecureStorage();

  Future<String?> read(String key) async => null;

  Future<void> write({required String key, required String value}) async {
    throw UnsupportedError(
      'Secure storage is intentionally not implemented until mobile auth is selected.',
    );
  }

  Future<void> delete(String key) async {}
}
