import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as path;
import '../constants/app_config.dart';
import '../models/user_model.dart';
import '../models/business_model.dart';
import '../models/invoice_model.dart';

class LocalStorageService {
  LocalStorageService._();

  static late SharedPreferences _prefs;
  static Database? _db;

  static Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    await _initDatabase();
  }

  static Future<void> _initDatabase() async {
    final dbPath = await getDatabasesPath();
    _db = await openDatabase(
      path.join(dbPath, 'ezybills.db'),
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE pending_invoices (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            created_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE offline_products (
            id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            synced_at INTEGER NOT NULL
          )
        ''');
        await db.execute('''
          CREATE TABLE offline_customers (
            id INTEGER PRIMARY KEY,
            data TEXT NOT NULL,
            synced_at INTEGER NOT NULL
          )
        ''');
      },
    );
  }

  // ---------- Auth ----------

  static Future<void> saveToken(String token) =>
      _prefs.setString(AppConfig.storageKeyAuthToken, token);

  static String? getToken() =>
      _prefs.getString(AppConfig.storageKeyAuthToken);

  static Future<void> clearToken() =>
      _prefs.remove(AppConfig.storageKeyAuthToken);

  static Future<void> saveUser(UserModel user) =>
      _prefs.setString(AppConfig.storageKeyUser, jsonEncode(user.toJson()));

  static UserModel? getUser() {
    final raw = _prefs.getString(AppConfig.storageKeyUser);
    if (raw == null) return null;
    return UserModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  static Future<void> clearUser() => _prefs.remove(AppConfig.storageKeyUser);

  // ---------- Business ----------

  static Future<void> saveBusiness(BusinessModel business) =>
      _prefs.setString(
          AppConfig.storageKeyBusiness, jsonEncode(business.toJson()));

  static BusinessModel? getBusiness() {
    final raw = _prefs.getString(AppConfig.storageKeyBusiness);
    if (raw == null) return null;
    return BusinessModel.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  // ---------- Settings ----------

  static Future<void> saveSetting(String key, String value) =>
      _prefs.setString(key, value);

  static String? getSetting(String key) => _prefs.getString(key);

  static Future<void> saveBoolSetting(String key, {required bool value}) =>
      _prefs.setBool(key, value);

  static bool getBoolSetting(String key, {bool defaultValue = false}) =>
      _prefs.getBool(key) ?? defaultValue;

  // ---------- Pending Invoices (Offline Queue) ----------

  static Future<void> saveOfflineInvoice(
      String tempId, Map<String, dynamic> invoiceData) async {
    await _db!.insert(
      'pending_invoices',
      {
        'id': tempId,
        'data': jsonEncode(invoiceData),
        'created_at': DateTime.now().millisecondsSinceEpoch,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<Map<String, dynamic>>> getPendingInvoices() async {
    final rows = await _db!.query('pending_invoices', orderBy: 'created_at ASC');
    return rows
        .map((r) => jsonDecode(r['data'] as String) as Map<String, dynamic>)
        .toList();
  }

  static Future<void> deleteOfflineInvoice(String tempId) =>
      _db!.delete('pending_invoices', where: 'id = ?', whereArgs: [tempId]);

  static Future<int> pendingInvoiceCount() async {
    final result =
        await _db!.rawQuery('SELECT COUNT(*) as count FROM pending_invoices');
    return (result.first['count'] as int?) ?? 0;
  }

  // ---------- Offline Products Cache ----------

  static Future<void> cacheProducts(List<Map<String, dynamic>> products) async {
    final batch = _db!.batch();
    batch.delete('offline_products');
    for (final p in products) {
      batch.insert('offline_products', {
        'id': p['id'],
        'data': jsonEncode(p),
        'synced_at': DateTime.now().millisecondsSinceEpoch,
      });
    }
    await batch.commit(noResult: true);
  }

  static Future<List<Map<String, dynamic>>> getCachedProducts() async {
    final rows = await _db!.query('offline_products');
    return rows
        .map((r) => jsonDecode(r['data'] as String) as Map<String, dynamic>)
        .toList();
  }

  // ---------- Offline Customers Cache ----------

  static Future<void> cacheCustomers(
      List<Map<String, dynamic>> customers) async {
    final batch = _db!.batch();
    batch.delete('offline_customers');
    for (final c in customers) {
      batch.insert('offline_customers', {
        'id': c['id'],
        'data': jsonEncode(c),
        'synced_at': DateTime.now().millisecondsSinceEpoch,
      });
    }
    await batch.commit(noResult: true);
  }

  static Future<List<Map<String, dynamic>>> getCachedCustomers() async {
    final rows = await _db!.query('offline_customers');
    return rows
        .map((r) => jsonDecode(r['data'] as String) as Map<String, dynamic>)
        .toList();
  }

  // ---------- Full Logout ----------

  static Future<void> clearAll() async {
    await _prefs.clear();
    await _db!.delete('pending_invoices');
    await _db!.delete('offline_products');
    await _db!.delete('offline_customers');
  }
}
