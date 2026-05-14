# EzyBills Mobile App

A production-ready Flutter mobile application for fast POS billing, inventory management, and business operations on Android and iOS devices.

## 📋 Features

- **Fast Billing** - Quick invoice generation with barcode scanning
- **Offline-First** - Work without internet, sync later
- **Inventory Management** - Real-time stock tracking and alerts
- **Customer Management** - Quick customer lookup and credit tracking
- **Report & Analytics** - Sales, inventory, and financial reports
- **Receipt Printing** - Thermal printer support
- **Barcode Scanning** - Camera-based barcode reading
- **Multi-User** - Role-based access (Owner, Manager, Cashier)
- **Restaurant Features** - Table management, KOT system (optional)

## 🏗️ Architecture

```
lib/
├── core/                          # Core functionality
│   ├── services/                  # API service, local storage
│   ├── models/                    # Data models
│   ├── providers/                 # Riverpod providers (state)
│   ├── widgets/                   # Shared widgets
│   ├── utils/                     # Utilities and helpers
│   └── constants/                 # App constants
├── features/
│   ├── auth/                      # Authentication
│   │   ├── screens/
│   │   ├── widgets/
│   │   ├── providers/
│   │   └── services/
│   ├── billing/                   # POS Billing
│   ├── products/                  # Product management
│   ├── inventory/                 # Stock management
│   ├── customers/                 # Customer management
│   ├── suppliers/                 # Supplier management
│   ├── expenses/                  # Expense tracking
│   ├── reports/                   # Analytics & reports
│   ├── settings/                  # App settings
│   ├── business/                  # Business setup
│   └── restaurant/                # Restaurant features (optional)
└── main.dart                      # App entry point
```

## 📦 Tech Stack

- **Framework**: Flutter 3.x
- **Language**: Dart
- **State Management**: Riverpod 2.x
- **HTTP Client**: Dio 5.x
- **Local Storage**: Hive + SharedPreferences
- **Database**: SQLite (offline sync)
- **Barcode Scanning**: mobile_scanner
- **Printing**: printing + pdf
- **Firebase**: Analytics, Crashlytics, Messaging

## 🚀 Getting Started

### Prerequisites

- Flutter 3.10+ ([Install Flutter](https://flutter.dev/docs/get-started/install))
- Dart 3.0+
- Android Studio or Xcode

### Installation

1. **Navigate to mobile-app folder**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies**
   ```bash
   flutter pub get
   ```

3. **Generate code**
   ```bash
   flutter pub run build_runner build
   ```

4. **Configure API endpoint** in `lib/core/constants/app_config.dart`
   ```dart
   const String API_BASE_URL = 'http://your-api-url:8000/api/v1';
   ```

5. **Run the app**
   ```bash
   # Android
   flutter run
   
   # iOS
   flutter run -d iPhone
   ```

## 📱 Screens Overview

### Authentication Module
- Login screen (email/password)
- OTP login screen
- Registration screen
- Password reset
- Splash screen

### Billing Module
- Quick billing/invoice creation
- Product search and barcode scanning
- Customer quick-add
- Payment method selection
- Hold/Resume invoices
- Invoice history
- Receipt printing/sharing

### Inventory Module
- Stock list with filtering
- Low stock alerts
- Stock adjustments
- Stock movements/ledger
- Stock-in from purchases

### Customer Module
- Customer list
- Customer details
- Purchase history
- Due amount tracking
- Credit limit management
- Customer groups

### Reports Module
- Sales report
- Inventory report
- Customer due report
- Daily closing report
- Charts and graphs

### Settings Module
- Business profile
- Tax settings
- Invoice templates
- Printer configuration
- User profile
- Backup & sync

## 🔌 API Integration

All API calls go through the `ApiService` in `lib/core/services/api_service.dart`:

```dart
// Example: Create invoice
final response = await apiService.createInvoice(invoiceData);
```

Requests are automatically authenticated with stored JWT token.

## 💾 Local Storage

- **Hive**: User preferences, app settings, cached data
- **SQLite**: Offline invoice data, draft invoices
- **SharedPreferences**: Quick access tokens, user info

## 📊 State Management

Using **Riverpod** providers for clean state management:

```dart
// Auth provider
final authProvider = StateNotifierProvider((ref) => AuthNotifier());

// Billing provider
final billingProvider = StateNotifierProvider((ref) => BillingNotifier());
```

## 🔐 Security

- Secure token storage using flutter_secure_storage
- SSL certificate pinning for API requests
- Encrypted local database
- Biometric authentication support

## 🧪 Testing

```bash
# Run tests
flutter test

# Run with coverage
flutter test --coverage

# Run specific test
flutter test test/features/auth/auth_test.dart
```

## 🔄 Offline Sync

The app supports offline-first workflow:
1. Create invoices offline (stored in SQLite)
2. Auto-sync when internet is available
3. Conflict resolution for concurrent updates

## 📤 Building for Release

### Android
```bash
flutter build apk --release
# or
flutter build appbundle --release
```

### iOS
```bash
flutter build ios --release
```

## 📝 Coding Standards

- Follow Dart style guide
- Use meaningful variable names
- Add documentation comments
- Keep functions small and focused
- Use const constructors where possible
- Implement proper error handling

## 🐛 Debugging

Enable debug logs:
```dart
// In main.dart
void main() {
  // Enable detailed logging
  enableDebugLogging();
  runApp(const EzyBillsApp());
}
```

## 📦 Dependencies

See `pubspec.yaml` for complete list. Key packages:
- **riverpod**: State management
- **dio**: HTTP client
- **hive_flutter**: Local storage
- **mobile_scanner**: Barcode scanning
- **firebase_***: Analytics and crash reporting

## 🚢 Deployment

### Pre-release Checklist
- [ ] Run all tests: `flutter test`
- [ ] Check code quality: `flutter analyze`
- [ ] Update version in pubspec.yaml
- [ ] Test on physical devices
- [ ] Prepare release notes

### Distribution
- **Google Play Store**: Use Play Console
- **Apple App Store**: Use TestFlight + App Store Connect
- **Direct APK**: Build and distribute apk directly

## 📞 Support

For issues or feature requests, contact the development team.

## 📄 License

Proprietary - EzyBills © 2026

---

**Made with ❤️ for EzyBills**
