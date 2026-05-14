class StockModel {
  final int id;
  final int productId;
  final int businessId;
  final double currentStock;
  final double minimumStock;
  final double openingStock;
  final DateTime? updatedAt;

  const StockModel({
    required this.id,
    required this.productId,
    required this.businessId,
    required this.currentStock,
    this.minimumStock = 0,
    this.openingStock = 0,
    this.updatedAt,
  });

  factory StockModel.fromJson(Map<String, dynamic> json) => StockModel(
        id: json['id'] as int,
        productId: json['product_id'] as int,
        businessId: json['business_id'] as int,
        currentStock: _toDouble(json['current_stock']),
        minimumStock: _toDouble(json['minimum_stock']),
        openingStock: _toDouble(json['opening_stock']),
        updatedAt: json['updated_at'] != null
            ? DateTime.tryParse(json['updated_at'] as String)
            : null,
      );

  bool get isLow => currentStock <= minimumStock;
  bool get isOut => currentStock <= 0;

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}

class StockMovementModel {
  final int id;
  final int productId;
  final String productName;
  final int businessId;
  final String type; // in / out / adjustment
  final double quantity;
  final double previousStock;
  final double currentStock;
  final String? reason;
  final DateTime createdAt;

  const StockMovementModel({
    required this.id,
    required this.productId,
    required this.productName,
    required this.businessId,
    required this.type,
    required this.quantity,
    required this.previousStock,
    required this.currentStock,
    this.reason,
    required this.createdAt,
  });

  factory StockMovementModel.fromJson(Map<String, dynamic> json) =>
      StockMovementModel(
        id: json['id'] as int,
        productId: json['product_id'] as int,
        productName: json['product']?['name'] as String? ?? '',
        businessId: json['business_id'] as int,
        type: json['type'] as String,
        quantity: _toDouble(json['quantity']),
        previousStock: _toDouble(json['previous_stock']),
        currentStock: _toDouble(json['current_stock']),
        reason: json['reason'] as String?,
        createdAt: DateTime.parse(json['created_at'] as String),
      );

  bool get isIn => type == 'in';

  static double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }
}
