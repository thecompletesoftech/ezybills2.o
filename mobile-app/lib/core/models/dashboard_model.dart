class DashboardModel {
  final double todaySales;
  final int todayInvoices;
  final double todayCollections;
  final int totalCustomers;
  final int totalProducts;
  final int lowStockCount;
  final double pendingDues;
  final double thisMonthSales;
  final double lastMonthSales;
  final List<WeeklyDataPoint> weeklyData;
  final List<TopProduct> topProducts;

  const DashboardModel({
    this.todaySales = 0,
    this.todayInvoices = 0,
    this.todayCollections = 0,
    this.totalCustomers = 0,
    this.totalProducts = 0,
    this.lowStockCount = 0,
    this.pendingDues = 0,
    this.thisMonthSales = 0,
    this.lastMonthSales = 0,
    this.weeklyData = const [],
    this.topProducts = const [],
  });

  factory DashboardModel.fromJson(Map<String, dynamic> json) => DashboardModel(
        todaySales: _toDouble(json['today_sales']),
        todayInvoices: (json['today_invoices'] as int?) ?? 0,
        todayCollections: _toDouble(json['today_collections']),
        totalCustomers: (json['total_customers'] as int?) ?? 0,
        totalProducts: (json['total_products'] as int?) ?? 0,
        lowStockCount: (json['low_stock_count'] as int?) ?? 0,
        pendingDues: _toDouble(json['pending_dues']),
        thisMonthSales: _toDouble(json['this_month_sales']),
        lastMonthSales: _toDouble(json['last_month_sales']),
        weeklyData: (json['weekly_data'] as List<dynamic>?)
                ?.map((e) =>
                    WeeklyDataPoint.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
        topProducts: (json['top_products'] as List<dynamic>?)
                ?.map(
                    (e) => TopProduct.fromJson(e as Map<String, dynamic>))
                .toList() ??
            [],
      );

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}

class WeeklyDataPoint {
  final String label;
  final double sales;
  final int invoices;

  const WeeklyDataPoint({
    required this.label,
    required this.sales,
    required this.invoices,
  });

  factory WeeklyDataPoint.fromJson(Map<String, dynamic> json) =>
      WeeklyDataPoint(
        label: json['label'] as String,
        sales: _toDouble(json['sales']),
        invoices: (json['invoices'] as int?) ?? 0,
      );

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}

class TopProduct {
  final int productId;
  final String productName;
  final double totalSales;
  final int quantity;

  const TopProduct({
    required this.productId,
    required this.productName,
    required this.totalSales,
    required this.quantity,
  });

  factory TopProduct.fromJson(Map<String, dynamic> json) => TopProduct(
        productId: json['product_id'] as int,
        productName: json['product_name'] as String,
        totalSales: _toDouble(json['total_sales']),
        quantity: (json['quantity'] as int?) ?? 0,
      );

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}
