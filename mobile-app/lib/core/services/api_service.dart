import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../constants/app_config.dart';
import 'local_storage_service.dart';

class ApiException implements Exception {
  ApiException({required this.message, this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiService {
  ApiService._();

  static late Dio _dio;

  static Future<void> initialize() async {
    _dio = Dio(BaseOptions(
      baseUrl: EnvironmentConfig.apiUrl,
      connectTimeout: Duration(seconds: AppConfig.apiTimeoutDuration),
      receiveTimeout: Duration(seconds: AppConfig.apiTimeoutDuration),
      headers: {'Accept': 'application/json', 'Content-Type': 'application/json'},
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final prefs = await SharedPreferences.getInstance();
        final token = prefs.getString(AppConfig.storageKeyAuthToken);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Token expired mid-session — clear local credentials
          // The authProvider will rebuild and show LoginScreen on next state change
          await LocalStorageService.clearToken();
          await LocalStorageService.clearUser();
        }
        handler.next(error);
      },
    ));

    if (EnvironmentConfig.enableDebugLogging) {
      _dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
      ));
    }
  }

  static Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get(
        path,
        queryParameters: queryParameters,
      );
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  static Future<Map<String, dynamic>> post(
    String path, {
    dynamic data,
    bool isFormData = false,
  }) async {
    try {
      final response = await _dio.post(
        path,
        data: isFormData ? FormData.fromMap(data as Map<String, dynamic>) : data,
      );
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  static Future<Map<String, dynamic>> put(
    String path, {
    dynamic data,
  }) async {
    try {
      final response = await _dio.put(path, data: data);
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  static Future<Map<String, dynamic>> delete(String path) async {
    try {
      final response = await _dio.delete(path);
      return _handleResponse(response);
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  // Returns raw list for paginated/list endpoints
  static Future<List<dynamic>> getList(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get(path, queryParameters: queryParameters);
      final body = response.data;
      if (body is Map && body.containsKey('data')) {
        return body['data'] as List<dynamic>;
      }
      if (body is List) return body;
      return [];
    } on DioException catch (e) {
      throw _mapDioError(e);
    }
  }

  static Map<String, dynamic> _handleResponse(Response response) {
    final data = response.data;
    if (data is Map<String, dynamic>) return data;
    return {'data': data};
  }

  static ApiException _mapDioError(DioException e) {
    if (e.type == DioExceptionType.connectionTimeout ||
        e.type == DioExceptionType.receiveTimeout) {
      return ApiException(message: 'Connection timed out. Check your internet.', statusCode: 408);
    }
    if (e.type == DioExceptionType.connectionError) {
      return ApiException(message: 'No internet connection.', statusCode: 0);
    }

    final statusCode = e.response?.statusCode;
    final responseData = e.response?.data;
    String message = 'Something went wrong. Please try again.';

    if (responseData is Map) {
      message = responseData['message'] as String? ??
          responseData['error'] as String? ??
          message;
    }

    if (statusCode == 401) message = 'Session expired. Please login again.';
    if (statusCode == 403) message = 'Access denied.';
    if (statusCode == 404) message = 'Resource not found.';
    if (statusCode == 422) {
      final errors = responseData?['errors'];
      if (errors is Map) {
        final firstError = errors.values.first;
        message = firstError is List ? firstError.first.toString() : firstError.toString();
      }
    }

    return ApiException(message: message, statusCode: statusCode);
  }

  // Expose Dio for multipart uploads
  static Dio get dio => _dio;
}
