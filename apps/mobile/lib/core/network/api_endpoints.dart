abstract final class ApiEndpoints {
  static const String health = '/api/health';
  static const String authSession = '/api/auth/session';
  static const String practitioners = '/api/practitioners';
  static const String appointments = '/api/appointments';
  static const String patients = '/api/patients';

  static String practitioner(String id) {
    return '$practitioners/${Uri.encodeComponent(id)}';
  }

  static String appointment(String id) {
    return '$appointments/${Uri.encodeComponent(id)}';
  }
}
