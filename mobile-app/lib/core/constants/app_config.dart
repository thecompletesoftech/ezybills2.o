/// App configuration constants
class AppConfig {
  // API Configuration
  static const String apiBaseUrl = 'http://localhost:8000/api/v1';
  static const int apiTimeoutDuration = 30; // seconds
  static const int apiRetryAttempts = 3;

  // App Info
  static const String appName = 'EzyBills POS';
  static const String appVersion = '1.0.0';
  static const String packageName = 'com.ezybills.mobile';

  // Feature Flags
  static const bool enableOfflineMode = true;
  static const bool enableBarcodeScanning = true;
  static const bool enableThermalPrinter = true;
  static const bool enableAnalytics = true;
  static const bool enableCrashReporting = true;

  // Storage Keys
  static const String storageKeyAuthToken = 'auth_token';
  static const String storageKeyUser = 'user_data';
  static const String storageKeyBusiness = 'business_data';
  static const String storageKeySettings = 'app_settings';
  static const String storageKeyDeviceId = 'device_id';

  // UI Constants
  static const double defaultPadding = 16.0;
  static const double defaultBorderRadius = 8.0;
  static const double defaultElevation = 2.0;

  // Timeouts
  static const Duration tokenRefreshDuration = Duration(hours: 23);
  static const Duration sessionTimeoutDuration = Duration(hours: 24);
  static const Duration syncInterval = Duration(minutes: 5);
}

// Environment-specific configuration
class EnvironmentConfig {
  static const String environment = 'development'; // development, staging, production

  static bool get isDevelopment => environment == 'development';
  static bool get isStaging => environment == 'staging';
  static bool get isProduction => environment == 'production';

  static String get apiUrl {
    switch (environment) {
      case 'production':
        return 'https://api.ezybills.com/api/v1';
      case 'staging':
        return 'https://staging-api.ezybills.com/api/v1';
      default:
        return AppConfig.apiBaseUrl;
    }
  }

  static bool get enableDebugLogging => isDevelopment || isStaging;
}
