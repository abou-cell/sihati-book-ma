import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import '../../shared/models/api_response.dart';
import '../config/app_config.dart';
import '../errors/app_exception.dart';
import '../storage/secure_storage_service.dart';

typedef TokenProvider = Future<String?> Function();

class ApiClient {
  ApiClient({
    required this.config,
    http.Client? httpClient,
    SecureStorageService? secureStorage,
    TokenProvider? tokenProvider,
  })  : _httpClient = httpClient ?? http.Client(),
        _secureStorage = secureStorage,
        _tokenProvider = tokenProvider;

  final AppConfig config;
  final http.Client _httpClient;
  final SecureStorageService? _secureStorage;
  final TokenProvider? _tokenProvider;

  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    required T Function(Object? json) parser,
  }) {
    return _send(
      'GET',
      path,
      queryParameters: queryParameters,
      parser: parser,
    );
  }

  Future<T> post<T>(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    required T Function(Object? json) parser,
  }) {
    return _send(
      'POST',
      path,
      body: body,
      queryParameters: queryParameters,
      parser: parser,
    );
  }

  Future<T> put<T>(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    required T Function(Object? json) parser,
  }) {
    return _send(
      'PUT',
      path,
      body: body,
      queryParameters: queryParameters,
      parser: parser,
    );
  }

  Future<T> patch<T>(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    required T Function(Object? json) parser,
  }) {
    return _send(
      'PATCH',
      path,
      body: body,
      queryParameters: queryParameters,
      parser: parser,
    );
  }

  Future<T> delete<T>(
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    required T Function(Object? json) parser,
  }) {
    return _send(
      'DELETE',
      path,
      body: body,
      queryParameters: queryParameters,
      parser: parser,
    );
  }

  Future<ApiResponse<T>> getEnvelope<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    required T Function(Object? json) parser,
  }) {
    return get<ApiResponse<T>>(
      path,
      queryParameters: queryParameters,
      parser: (json) => ApiResponse.fromJson(json, parser),
    );
  }

  void close() {
    _httpClient.close();
  }

  Future<T> _send<T>(
    String method,
    String path, {
    Object? body,
    Map<String, dynamic>? queryParameters,
    required T Function(Object? json) parser,
  }) async {
    final uri = config.resolveApiUri(path, queryParameters);
    final request = http.Request(method, uri)
      ..headers.addAll(await _defaultHeaders());

    if (body != null) {
      request.body = jsonEncode(body);
    }

    final response = await _safeSend(request);
    final decodedBody = _decodeBody(response);

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw _exceptionForResponse(response.statusCode, decodedBody);
    }

    return parser(decodedBody);
  }

  Future<Map<String, String>> _defaultHeaders() async {
    final headers = <String, String>{
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };

    final token = await _readAuthToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  Future<String?> _readAuthToken() {
    if (_tokenProvider != null) {
      return _tokenProvider();
    }

    final secureStorage = _secureStorage;
    if (secureStorage != null) {
      return secureStorage.readAuthToken();
    }

    return Future.value();
  }

  Future<http.Response> _safeSend(http.Request request) async {
    try {
      final streamedResponse =
          await _httpClient.send(request).timeout(config.apiTimeout);
      return http.Response.fromStream(streamedResponse);
    } on TimeoutException catch (error) {
      throw AppException.timeout(details: error.toString());
    } on http.ClientException catch (error) {
      throw AppException.network(details: error.message);
    } catch (error) {
      throw AppException.network(details: error.toString());
    }
  }

  Object? _decodeBody(http.Response response) {
    if (response.body.trim().isEmpty) {
      return null;
    }

    try {
      return jsonDecode(response.body);
    } on FormatException catch (error) {
      throw AppException.parsing(details: error.message);
    }
  }

  AppException _exceptionForResponse(int statusCode, Object? body) {
    String? code;
    String? message;
    Object? details;

    if (body is JsonMap) {
      final error = body['error'];
      if (error is JsonMap) {
        code = error['code']?.toString();
        message = error['message']?.toString();
        details = error['details'];
      } else {
        code = body['code']?.toString();
        message = body['message']?.toString();
        details = body['details'];
      }
    }

    return AppException.fromStatusCode(
      statusCode,
      code: code,
      message: message,
      details: details,
    );
  }
}
