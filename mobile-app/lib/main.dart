import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/constants/app_config.dart';
import 'core/providers/auth_provider.dart';
import 'core/services/api_service.dart';
import 'core/services/local_storage_service.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/main_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await ApiService.initialize();
  await LocalStorageService.initialize();
  runApp(const ProviderScope(child: EzyBillsApp()));
}

class EzyBillsApp extends ConsumerWidget {
  const EzyBillsApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);

    return MaterialApp(
      title: AppConfig.appName,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0066CC),
          brightness: Brightness.light,
        ),
        fontFamily: 'Roboto',
        appBarTheme: const AppBarTheme(
          elevation: 0,
          backgroundColor: Color(0xFF0066CC),
          foregroundColor: Colors.white,
          centerTitle: false,
        ),
        cardTheme: CardThemeData(
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppConfig.defaultBorderRadius),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(AppConfig.defaultBorderRadius),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
        ),
      ),
      darkTheme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0066CC),
          brightness: Brightness.dark,
        ),
        fontFamily: 'Roboto',
      ),
      themeMode: ThemeMode.light,
      debugShowCheckedModeBanner: false,
      home: authState.when(
        data: (user) => user != null ? const MainShell() : const LoginScreen(),
        loading: () => const _SplashScreen(),
        error: (_, __) => const LoginScreen(),
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  color: const Color(0xFF0066CC),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Icon(Icons.receipt_long,
                    size: 56, color: Colors.white),
              ),
              const SizedBox(height: 24),
              const Text(
                'EzyBills POS',
                style: TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'Fast Billing for Smart Businesses',
                style: TextStyle(color: Colors.grey.shade600),
              ),
              const SizedBox(height: 32),
              const CircularProgressIndicator(),
            ],
          ),
        ),
      );
}
